import { describe, expect, it } from 'bun:test';
import { signState, verifyState } from './signed-state-cookie';

const SECRET = 'a'.repeat(32);

describe('signed-state-cookie', () => {
  it('signState → verifyState round-trip recovers the original value', () => {
    const signed = signState('abc123', SECRET);
    const recovered = verifyState(signed, { secret: SECRET, ttlMs: 60_000 });
    expect(recovered).toBe('abc123');
  });

  it('rejects an undefined cookie', () => {
    expect(verifyState(undefined, { secret: SECRET, ttlMs: 60_000 })).toBeNull();
  });

  it('rejects a tampered value', () => {
    const signed = signState('abc', SECRET);
    const tampered = signed.replace(/^abc/, 'xyz');
    expect(verifyState(tampered, { secret: SECRET, ttlMs: 60_000 })).toBeNull();
  });

  it('rejects a tampered signature', () => {
    const signed = signState('abc', SECRET);
    const parts = signed.split('.');
    const signature = parts[2] ?? '';
    // Flip a significant base64url character; the final char may only carry padding bits.
    parts[2] = (signature.startsWith('A') ? 'B' : 'A') + signature.slice(1);
    const tampered = parts.join('.');
    expect(verifyState(tampered, { secret: SECRET, ttlMs: 60_000 })).toBeNull();
  });

  it('rejects a different secret', () => {
    const signed = signState('abc', SECRET);
    const otherSecret = 'b'.repeat(32);
    expect(verifyState(signed, { secret: otherSecret, ttlMs: 60_000 })).toBeNull();
  });

  it('rejects an expired cookie', () => {
    const signed = signState('abc', SECRET);
    // Inject `now` 2 hours later.
    const future = Date.now() + 2 * 60 * 60 * 1000;
    expect(verifyState(signed, { secret: SECRET, ttlMs: 60_000, now: () => future })).toBeNull();
  });

  it('rejects a malformed cookie (missing parts)', () => {
    expect(verifyState('only-one-part', { secret: SECRET, ttlMs: 60_000 })).toBeNull();
    expect(verifyState('two.parts', { secret: SECRET, ttlMs: 60_000 })).toBeNull();
  });

  it('rejects an empty value with valid signature shape', () => {
    expect(verifyState('.1700000000.x', { secret: SECRET, ttlMs: 60_000 })).toBeNull();
  });

  it('rejects a cookie from the far future (clock skew protection)', () => {
    const signed = signState('abc', SECRET);
    // verifyState with `now` 1 hour in the past relative to signing
    const past = Date.now() - 60 * 60 * 1000;
    expect(verifyState(signed, { secret: SECRET, ttlMs: 60_000, now: () => past })).toBeNull();
  });
});
