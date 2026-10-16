import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RateLimiter } from '../../server/rateLimit';
import { checkFormToken, issueFormToken } from '../../server/formToken';

test('limiter blocks after the budget and recovers after the window', () => {
  let t = 1_000_000;
  const l = new RateLimiter(3, 60_000, () => t);
  assert.equal(l.take('a').allowed, true);
  assert.equal(l.take('a').allowed, true);
  assert.equal(l.take('a').allowed, true);
  const blocked = l.take('a');
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds >= 1 && blocked.retryAfterSeconds <= 60);
  assert.equal(l.take('b').allowed, true, 'other keys are independent');
  t += 61_000;
  assert.equal(l.take('a').allowed, true);
});

test('limiter sweeps idle keys', () => {
  let t = 0;
  const l = new RateLimiter(1, 1000, () => t);
  l.take('x');
  t += 5000;
  l.take('y');
  assert.equal(l.size, 1);
});

test('form token: ok, too fresh, expired, tampered, malformed', () => {
  const secret = 's3cret';
  const issued = 1_700_000_000_000;
  const tok = issueFormToken(secret, issued);
  const opts = { minAgeSeconds: 2, maxAgeSeconds: 100 };
  assert.equal(checkFormToken(secret, tok, { ...opts, now: issued + 5_000 }), 'ok');
  assert.equal(checkFormToken(secret, tok, { ...opts, now: issued + 500 }), 'too_fresh');
  assert.equal(checkFormToken(secret, tok, { ...opts, now: issued + 200_000 }), 'expired');
  assert.equal(checkFormToken('other', tok, { ...opts, now: issued + 5_000 }), 'bad_signature');
  const tampered = tok.replace(String(issued), String(issued - 1_000_000));
  assert.equal(checkFormToken(secret, tampered, { ...opts, now: issued + 5_000 }), 'bad_signature');
  assert.equal(checkFormToken(secret, 'garbage', opts), 'malformed');
  assert.equal(checkFormToken(secret, 42, opts), 'malformed');
});
