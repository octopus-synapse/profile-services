import { describe, expect, it } from 'bun:test';
import { hashToken } from './token-hash';

describe('hashToken', () => {
  it('produces 64 hex chars (SHA-256)', () => {
    expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same input', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });

  it('produces different output for different input', () => {
    expect(hashToken('a')).not.toBe(hashToken('b'));
  });

  it('never returns the plaintext as a substring', () => {
    expect(hashToken('mysecrettoken').includes('mysecrettoken')).toBe(false);
  });
});
