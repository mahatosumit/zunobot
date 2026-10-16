import { createServer, type Server } from 'node:http';
import type { ServerConfig } from './config';
import { createApi } from './api';
import type { WaitlistStore } from './db';
import { setSecurityHeaders } from './security';
import { createStaticHandler } from './static';

export function createAppServer(config: ServerConfig, store: WaitlistStore, opts: { quiet?: boolean; now?: () => number } = {}): Server {
  const log = opts.quiet ? () => undefined : (line: string) => console.log(line);
  const api = createApi({ config, store, log, ...(opts.now ? { now: opts.now } : {}) });
  const serveStatic = createStaticHandler(config.staticDir);

  return createServer((req, res) => {
    const started = Date.now();
    setSecurityHeaders(res);
    // Only the path is read and logged. Query strings can carry personal data, so they are never logged.
    const pathname = (req.url ?? '/').split('?')[0] ?? '/';
    res.on('finish', () => {
      if (!pathname.startsWith('/assets/') && !pathname.startsWith('/fonts/') && !pathname.startsWith('/images/')) {
        log(`${req.method} ${pathname} ${res.statusCode} ${Date.now() - started}ms`);
      }
    });
    (async () => {
      if (await api(req, res, pathname)) return;
      await serveStatic(req, res, pathname);
    })().catch((err: unknown) => {
      log(`unhandled error: ${(err as Error).name}`);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server error');
    });
  });
}
