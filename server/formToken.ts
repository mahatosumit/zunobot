import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

/**
 * Anti-spam form token: `<issuedAtMs>.<nonce>.<hmac>`.
 * It proves the form was loaded at least `minAge` seconds ago (bots usually POST immediately) and not
 * longer than `maxAge` ago. It is not a CAPTCHA: it only raises the cost of naive scripted abuse.
 */
export function issueFormToken(secret: string, now = Date.now()): string {
  const body = `${now}.${randomBytes(6).toString('hex')}`;
  return `${body}.${sign(secret, body)}`;
}

export type TokenCheck = 'ok' | 'malformed' | 'bad_signature' | 'too_fresh' | 'expired';

export function checkFormToken(
  secret: string,
  token: unknown,
  opts: { minAgeSeconds: number; maxAgeSeconds: number; now?: number },
): TokenCheck {
  if (typeof token !== 'string' || token.length > 200) return 'malformed';
  const parts = token.split('.');
  if (parts.length !== 3) return 'malformed';
  const [issued, nonce, mac] = parts as [string, string, string];
  if (!/^\d{10,16}$/.test(issued) || !/^[0-9a-f]{12}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(mac)) return 'malformed';
  const expected = sign(secret, `${issued}.${nonce}`);
  const a = Buffer.from(mac, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return 'bad_signature';
  const age = ((opts.now ?? Date.now()) - Number(issued)) / 1000;
  if (age < opts.minAgeSeconds) return 'too_fresh';
  if (age > opts.maxAgeSeconds) return 'expired';
  return 'ok';
}

function sign(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}
