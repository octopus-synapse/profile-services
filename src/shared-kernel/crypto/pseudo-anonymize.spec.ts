import { describe, expect, it } from 'bun:test';
import type { ConfigPort } from '../config/config.port';
import type { EnvConfig } from '../config/config.schema';
import { pseudoAnonymize } from './pseudo-anonymize';

function makeConfig(salt: string | undefined): ConfigPort {
  return {
    env: { IP_HASH_SALT: salt } as EnvConfig,
    get: () => undefined,
    getOrDefault: <T>(_k: string, d: T) => d,
  } as ConfigPort;
}

describe('pseudoAnonymize', () => {
  const SALT = 'x'.repeat(64);

  it('returns the same digest for the same input + salt', () => {
    const cfg = makeConfig(SALT);
    expect(pseudoAnonymize('203.0.113.42', cfg)).toBe(pseudoAnonymize('203.0.113.42', cfg));
  });

  it('returns different digests for different inputs', () => {
    const cfg = makeConfig(SALT);
    expect(pseudoAnonymize('203.0.113.42', cfg)).not.toBe(pseudoAnonymize('203.0.113.43', cfg));
  });

  it('different salts produce different digests for the same input', () => {
    const a = makeConfig(SALT);
    const b = makeConfig('y'.repeat(64));
    expect(pseudoAnonymize('203.0.113.42', a)).not.toBe(pseudoAnonymize('203.0.113.42', b));
  });

  it('returns 64-char hex', () => {
    const cfg = makeConfig(SALT);
    const out = pseudoAnonymize('1.2.3.4', cfg);
    expect(out).toMatch(/^[0-9a-f]{64}$/);
  });

  it('without salt: IPv4 /24 truncation collapses last octet', () => {
    const cfg = makeConfig(undefined);
    expect(pseudoAnonymize('203.0.113.42', cfg)).toBe(pseudoAnonymize('203.0.113.99', cfg));
    expect(pseudoAnonymize('203.0.113.42', cfg)).not.toBe(pseudoAnonymize('203.0.114.42', cfg));
  });

  it('without salt: IPv6 /48 truncation collapses tail groups', () => {
    const cfg = makeConfig(undefined);
    expect(pseudoAnonymize('2001:db8:abcd:1234::1', cfg)).toBe(
      pseudoAnonymize('2001:db8:abcd:9999::ffff', cfg),
    );
    expect(pseudoAnonymize('2001:db8:abcd:1234::1', cfg)).not.toBe(
      pseudoAnonymize('2001:db8:ffff:1234::1', cfg),
    );
  });

  it('without salt: non-IP values still hash deterministically', () => {
    const cfg = makeConfig(undefined);
    expect(pseudoAnonymize('user-token-xyz', cfg)).toBe(pseudoAnonymize('user-token-xyz', cfg));
    expect(pseudoAnonymize('user-token-xyz', cfg)).not.toBe(pseudoAnonymize('user-token-abc', cfg));
  });
});
