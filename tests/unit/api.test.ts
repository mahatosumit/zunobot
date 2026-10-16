import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createAppServer } from '../../server/app';
import { loadConfig } from '../../server/config';
import { openWaitlistStore, type WaitlistStore } from '../../server/db';
import { issueFormToken } from '../../server/formToken';

let server: Server;
let base = '';
let store: WaitlistStore;
let clock = 1_800_000_000_000;
const SECRET = 'test-secret';

before(async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'zuno-'));
  mkdirSync(path.join(dir, 'privacy'));
  writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>home</title>');
  writeFileSync(path.join(dir, 'privacy', 'index.html'), '<!doctype html><title>privacy</title>');
  writeFileSync(path.join(dir, '404.html'), '<!doctype html><title>nope</title>');
  const config = loadConfig({ WAITLIST_TOKEN_SECRET: SECRET }, { staticDir: dir, submitLimit: { max: 100, windowSeconds: 600 } });
  store = openWaitlistStore(':memory:');
  server = createAppServer(config, store, { quiet: true, now: () => clock });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => {
  server.close();
  store.close();
});

const freshToken = () => issueFormToken(SECRET, clock - 10_000);
const post = (body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${base}/api/waitlist`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const good = (over: Record<string, unknown> = {}) => ({ name: 'Ada', email: 'ada@example.com', token: freshToken(), ...over });

test('stores a registration and returns ok', async () => {
  const res = await post(good());
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
  assert.equal(store.count(), 1);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('duplicate email is idempotent, keeps one row, refreshes answers and consent', async () => {
  const first = await post(good({ email: 'dup@example.com', interest: 'home', marketingOptIn: true }));
  assert.equal(first.status, 200);
  const before = store.count();
  const again = await post(good({ email: 'DUP@example.com ', name: 'Dup Two', message: 'hello', marketingOptIn: false }));
  assert.equal(again.status, 200);
  assert.equal(store.count(), before);
  const row = store.all().find((r) => r.email === 'dup@example.com');
  assert.ok(row);
  assert.equal(row.name, 'Dup Two');
  assert.equal(row.interest, 'home', 'blank optional fields never erase earlier answers');
  assert.equal(row.message, 'hello');
  assert.equal(row.marketing_opt_in, 0, 'consent follows the latest submission');
  assert.equal(row.submissions, 2);
});

test('invalid input returns 422 with field errors and stores nothing', async () => {
  const before = store.count();
  const res = await post(good({ name: '', email: 'bad' }));
  assert.equal(res.status, 422);
  const body = (await res.json()) as { status: string; errors: Record<string, string> };
  assert.equal(body.status, 'invalid');
  assert.ok(body.errors.name && body.errors.email);
  assert.equal(store.count(), before);
});

test('honeypot gets a silent fake success and nothing is stored', async () => {
  const before = store.count();
  const res = await post(good({ email: 'bot@example.com', website: 'http://spam.example' }));
  assert.equal(res.status, 200);
  assert.equal(store.count(), before);
});

test('missing, forged or too-fresh token is rejected', async () => {
  const before = store.count();
  for (const token of [undefined, 'x.y.z', issueFormToken('wrong', clock - 10_000), issueFormToken(SECRET, clock)]) {
    const res = await post({ name: 'T', email: 't@example.com', token });
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { status: 'token' });
  }
  assert.equal(store.count(), before);
});

test('token endpoint issues a usable token', async () => {
  const res = await fetch(`${base}/api/waitlist/token`);
  assert.equal(res.status, 200);
  const { token } = (await res.json()) as { token: string };
  assert.match(token, /^\d+\.[0-9a-f]{12}\.[0-9a-f]{64}$/);
});

test('rejects cross-origin browser posts, wrong content type, oversize and bad JSON', async () => {
  assert.equal((await post(good({ email: 'o@example.com' }), { origin: 'https://evil.example' })).status, 403);
  const form = await fetch(`${base}/api/waitlist`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'x' });
  assert.equal(form.status, 415);
  const huge = await fetch(`${base}/api/waitlist`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pad: 'x'.repeat(20_000) }) });
  assert.equal(huge.status, 413);
  const bad = await fetch(`${base}/api/waitlist`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{nope' });
  assert.equal(bad.status, 400);
});

test('rate limiting answers 429 with Retry-After', async () => {
  const config = loadConfig({ WAITLIST_TOKEN_SECRET: SECRET }, { submitLimit: { max: 3, windowSeconds: 600 } });
  const limitedStore = openWaitlistStore(':memory:');
  const limited = createAppServer(config, limitedStore, { quiet: true, now: () => clock });
  await new Promise<void>((r) => limited.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${(limited.address() as AddressInfo).port}/api/waitlist`;
  try {
    const statuses: number[] = [];
    let last: Response | undefined;
    for (let i = 0; i < 5; i++) {
      last = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(good({ email: `rl${i}@example.com` })) });
      statuses.push(last.status);
    }
    assert.deepEqual(statuses, [200, 200, 200, 429, 429]);
    assert.ok(Number(last?.headers.get('retry-after')) >= 1);
    assert.equal(((await last?.json()) as { status: string }).status, 'rate_limited');
    assert.equal(limitedStore.count(), 3);
  } finally {
    limited.close();
    limitedStore.close();
  }
});

test('GET on the submit route is not allowed; unknown API route is 404', async () => {
  assert.equal((await fetch(`${base}/api/waitlist`)).status, 405);
  assert.equal((await fetch(`${base}/api/nope`)).status, 404);
});

test('static: pages, 404 fallback, security headers, traversal blocked', async () => {
  const home = await fetch(`${base}/`);
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-security-policy') ?? '', /default-src 'self'/);
  assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
  assert.match(await (await fetch(`${base}/privacy`)).text(), /privacy/);
  const missing = await fetch(`${base}/does-not-exist`);
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /nope/);
  const trav = await fetch(`${base}/..%2f..%2fetc%2fpasswd`);
  assert.equal(trav.status, 404);
});
