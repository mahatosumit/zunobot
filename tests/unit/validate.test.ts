import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPlausibleEmail, validateWaitlist, cleanText } from '../../shared/waitlist';

test('accepts a minimal valid entry and normalises the email', () => {
  const r = validateWaitlist({ name: '  Ada   Lovelace ', email: ' Ada@Example.COM ' });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.name, 'Ada Lovelace');
    assert.equal(r.value.email, 'ada@example.com');
    assert.equal(r.value.marketingOptIn, false);
    assert.equal(r.value.researchOptIn, false);
  }
});

test('consent is only true when explicitly true', () => {
  const r = validateWaitlist({ name: 'A', email: 'a@b.co', marketingOptIn: 'true', researchOptIn: 1 });
  assert.equal(r.ok && r.value.marketingOptIn, false);
  assert.equal(r.ok && r.value.researchOptIn, false);
  const yes = validateWaitlist({ name: 'A', email: 'a@b.co', marketingOptIn: true });
  assert.equal(yes.ok && yes.value.marketingOptIn, true);
});

test('rejects missing and malformed fields with helpful messages', () => {
  const r = validateWaitlist({ name: '', email: 'nope', interest: 'pets', message: 'x'.repeat(601) });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.match(r.errors.name ?? '', /name/i);
    assert.match(r.errors.email ?? '', /email/i);
    assert.match(r.errors.interest ?? '', /listed/i);
    assert.match(r.errors.message ?? '', /600/);
  }
});

test('non-object input never throws', () => {
  for (const bad of [null, undefined, 42, 'str', [], true]) {
    const r = validateWaitlist(bad);
    assert.equal(r.ok, false);
  }
});

test('email plausibility', () => {
  for (const good of ['a@b.co', 'first.last+tag@sub.example.org', "o'neil@example.io"]) assert.equal(isPlausibleEmail(good), true, good);
  for (const bad of ['a@b', '@b.co', 'a@@b.co', 'a b@c.co', 'a..b@c.co', '.a@c.co', 'a@-c.co', 'a@c.123', 'a@c..co', 'x'.repeat(65) + '@c.co']) {
    assert.equal(isPlausibleEmail(bad), false, bad);
  }
});

test('cleanText strips control characters and collapses whitespace', () => {
  assert.equal(cleanText('a\u0000b\u0007  c\t\nd'), 'ab c d');
  assert.equal(cleanText('line1\r\n\n\n\nline2', true), 'line1\n\nline2');
  assert.equal(cleanText(123), '');
});
