import { createHmac } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { validateWaitlist, type WaitlistApiResponse } from '../shared/waitlist';
import type { ServerConfig } from './config';
import type { WaitlistStore } from './db';
import { checkFormToken, issueFormToken } from './formToken';
import { RateLimiter } from './rateLimit';

const MAX_BODY_BYTES = 8 * 1024;

export interface ApiDeps {
  config: ServerConfig;
  store: WaitlistStore;
  now?: () => number;
  log?: (line: string) => void;
}

export function createApi(deps: ApiDeps) {
  const { config, store } = deps;
  const now = deps.now ?? Date.now;
  const log = deps.log ?? ((line: string) => console.log(line));
  const submitLimiter = new RateLimiter(config.submitLimit.max, config.submitLimit.windowSeconds * 1000, now);
  const tokenLimiter = new RateLimiter(config.tokenLimit.max, config.tokenLimit.windowSeconds * 1000, now);
  const globalLimiter = new RateLimiter(config.globalSubmitLimit.max, config.globalSubmitLimit.windowSeconds * 1000, now);

  /** Salted hash of the client address, used only as an in-memory rate-limit key. The address is never stored or logged. */
  function clientKey(req: IncomingMessage): string {
    let ip = req.socket.remoteAddress ?? 'unknown';
    if (config.trustProxy) {
      const fwd = req.headers['x-forwarded-for'];
      const last = (Array.isArray(fwd) ? fwd.join(',') : fwd ?? '').split(',').map((s) => s.trim()).filter(Boolean).pop();
      if (last) ip = last;
    }
    return createHmac('sha256', config.tokenSecret).update(`ip:${ip}`).digest('hex');
  }

  function originAllowed(req: IncomingMessage): boolean {
    const origin = req.headers.origin;
    if (!origin) return true; // non-browser clients; still rate limited and token gated
    try {
      const u = new URL(origin);
      if (u.host === req.headers.host) return true;
      return config.allowedOrigins.includes(u.origin);
    } catch {
      return false;
    }
  }

  function send(res: ServerResponse, status: number, body: WaitlistApiResponse | Record<string, unknown>, headers: Record<string, string> = {}): void {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload),
      'Cache-Control': 'no-store',
      ...headers,
    });
    res.end(payload);
  }

  async function readJson(req: IncomingMessage): Promise<{ ok: true; data: unknown } | { ok: false; status: number }> {
    const type = String(req.headers['content-type'] ?? '');
    if (!type.toLowerCase().startsWith('application/json')) return { ok: false, status: 415 };
    const declared = Number(req.headers['content-length'] ?? 0);
    if (declared > MAX_BODY_BYTES) return { ok: false, status: 413 };
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      size += (chunk as Buffer).length;
      if (size > MAX_BODY_BYTES) return { ok: false, status: 413 };
      chunks.push(chunk as Buffer);
    }
    try {
      return { ok: true, data: JSON.parse(Buffer.concat(chunks).toString('utf8')) };
    } catch {
      return { ok: false, status: 400 };
    }
  }

  /** Returns true when the request was an API request and has been answered. */
  return async function handleApi(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<boolean> {
    if (!pathname.startsWith('/api/')) return false;
    const method = req.method ?? 'GET';

    if (pathname === '/api/health' && (method === 'GET' || method === 'HEAD')) {
      send(res, 200, { ok: true });
      return true;
    }

    if (pathname === '/api/waitlist/token' && method === 'GET') {
      const gate = tokenLimiter.take(clientKey(req));
      if (!gate.allowed) {
        send(res, 429, { status: 'rate_limited', retryAfterSeconds: gate.retryAfterSeconds }, { 'Retry-After': String(gate.retryAfterSeconds) });
        return true;
      }
      send(res, 200, { token: issueFormToken(config.tokenSecret, now()), minSeconds: config.minFormSeconds });
      return true;
    }

    if (pathname === '/api/waitlist') {
      if (method !== 'POST') {
        send(res, 405, { status: 'error' }, { Allow: 'POST' });
        return true;
      }
      if (!originAllowed(req)) {
        send(res, 403, { status: 'error' });
        return true;
      }
      const key = clientKey(req);
      const perClient = submitLimiter.take(key);
      const overall = globalLimiter.take('*');
      if (!perClient.allowed || !overall.allowed) {
        const retry = Math.max(perClient.retryAfterSeconds, overall.retryAfterSeconds);
        send(res, 429, { status: 'rate_limited', retryAfterSeconds: retry }, { 'Retry-After': String(retry) });
        return true;
      }

      const body = await readJson(req);
      if (!body.ok) {
        send(res, body.status, { status: 'error' });
        return true;
      }
      const data = (typeof body.data === 'object' && body.data !== null ? body.data : {}) as Record<string, unknown>;

      // Honeypot: pretend success so the bot learns nothing, store nothing.
      if (typeof data.website === 'string' && data.website.trim() !== '') {
        send(res, 200, { status: 'ok' });
        return true;
      }

      const tokenState = checkFormToken(config.tokenSecret, data.token, {
        minAgeSeconds: config.minFormSeconds,
        maxAgeSeconds: config.maxFormSeconds,
        now: now(),
      });
      if (tokenState !== 'ok') {
        send(res, 400, { status: 'token' });
        return true;
      }

      const result = validateWaitlist(data);
      if (!result.ok) {
        send(res, 422, { status: 'invalid', errors: result.errors });
        return true;
      }

      try {
        const { created } = store.upsert(result.value);
        // Deliberately no email, name or free text in logs.
        log(`waitlist ${created ? 'new' : 'repeat'} registration stored`);
        send(res, 200, { status: 'ok' });
      } catch (err) {
        log(`waitlist store failure: ${(err as Error).name}`);
        send(res, 500, { status: 'error' });
      }
      return true;
    }

    send(res, 404, { status: 'error' });
    return true;
  };
}
