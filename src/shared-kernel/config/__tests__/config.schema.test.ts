/**
 * Boot-time invariants enforced by the canonical env schema.
 * Each failure mode here is a P1 that already shipped to production
 * once — these tests prevent regression.
 */

import { describe, expect, it } from 'bun:test';
import { ConfigValidationError, parseEnvConfig } from '../config.schema';

const VALID_SECRET = 'a'.repeat(32);
const VALID_DB_URL = 'postgresql://u:p@localhost:5432/db';

function baseEnv(overrides: Record<string, string | undefined> = {}): Record<string, string> {
  const env: Record<string, string> = {
    NODE_ENV: 'test',
    DATABASE_URL: VALID_DB_URL,
    JWT_SECRET: VALID_SECRET,
  };
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete env[k];
    else env[k] = v;
  }
  return env;
}

describe('EnvConfigSchema — BCRYPT_COST floor', () => {
  it('rejects BCRYPT_COST below 10', () => {
    expect(() => parseEnvConfig(baseEnv({ BCRYPT_COST: '8' }))).toThrow(ConfigValidationError);
  });

  it('accepts BCRYPT_COST = 10 (boundary)', () => {
    const cfg = parseEnvConfig(baseEnv({ BCRYPT_COST: '10' }));
    expect(cfg.BCRYPT_COST).toBe(10);
  });

  it('defaults BCRYPT_COST to 12 when unset', () => {
    const cfg = parseEnvConfig(baseEnv());
    expect(cfg.BCRYPT_COST).toBe(12);
  });

  it('coerces BCRYPT_COST from string input', () => {
    const cfg = parseEnvConfig(baseEnv({ BCRYPT_COST: '14' }));
    expect(cfg.BCRYPT_COST).toBe(14);
  });
});

describe('EnvConfigSchema — production-required fields', () => {
  it('rejects production env missing JWT_ISSUER', () => {
    expect(() =>
      parseEnvConfig(
        baseEnv({
          NODE_ENV: 'production',
          JWT_AUDIENCE: 'patch-clients',
          IP_HASH_SALT: 'x'.repeat(32),
        }),
      ),
    ).toThrow(/JWT_ISSUER is required in production/);
  });

  it('rejects production env missing JWT_AUDIENCE', () => {
    expect(() =>
      parseEnvConfig(
        baseEnv({
          NODE_ENV: 'production',
          JWT_ISSUER: 'patch-careers',
          IP_HASH_SALT: 'x'.repeat(32),
        }),
      ),
    ).toThrow(/JWT_AUDIENCE is required in production/);
  });

  it('rejects production env missing IP_HASH_SALT', () => {
    expect(() =>
      parseEnvConfig(
        baseEnv({
          NODE_ENV: 'production',
          JWT_ISSUER: 'patch-careers',
          JWT_AUDIENCE: 'patch-clients',
        }),
      ),
    ).toThrow(/IP_HASH_SALT is required in production/);
  });

  it('accepts development env without any of those three (they stay optional)', () => {
    const cfg = parseEnvConfig(baseEnv({ NODE_ENV: 'development' }));
    expect(cfg.JWT_ISSUER).toBeUndefined();
    expect(cfg.JWT_AUDIENCE).toBeUndefined();
    expect(cfg.IP_HASH_SALT).toBeUndefined();
  });

  it('accepts production env with all three set', () => {
    const cfg = parseEnvConfig(
      baseEnv({
        NODE_ENV: 'production',
        JWT_ISSUER: 'patch-careers',
        JWT_AUDIENCE: 'patch-clients',
        IP_HASH_SALT: 'x'.repeat(40),
      }),
    );
    expect(cfg.JWT_ISSUER).toBe('patch-careers');
    expect(cfg.JWT_AUDIENCE).toBe('patch-clients');
    expect(cfg.IP_HASH_SALT?.length).toBe(40);
  });
});

describe('EnvConfigSchema — SMTP coercion (P1 #41)', () => {
  it('coerces SMTP_PORT="465" string to number 465', () => {
    const cfg = parseEnvConfig(baseEnv({ SMTP_PORT: '465' }));
    expect(cfg.SMTP_PORT).toBe(465);
    expect(typeof cfg.SMTP_PORT).toBe('number');
  });

  it('rejects non-numeric SMTP_PORT', () => {
    expect(() => parseEnvConfig(baseEnv({ SMTP_PORT: 'not-a-number' }))).toThrow(
      ConfigValidationError,
    );
  });

  it('coerces SMTP_SECURE="true" to boolean true', () => {
    const cfg = parseEnvConfig(baseEnv({ SMTP_SECURE: 'true' }));
    expect(cfg.SMTP_SECURE).toBe(true);
    expect(typeof cfg.SMTP_SECURE).toBe('boolean');
  });

  it('coerces SMTP_SECURE="false" to boolean false', () => {
    const cfg = parseEnvConfig(baseEnv({ SMTP_SECURE: 'false' }));
    expect(cfg.SMTP_SECURE).toBe(false);
    expect(typeof cfg.SMTP_SECURE).toBe('boolean');
  });
});

describe('EnvConfigSchema — IP_HASH_SALT length floor', () => {
  it('rejects IP_HASH_SALT shorter than 32 chars', () => {
    expect(() => parseEnvConfig(baseEnv({ IP_HASH_SALT: 'short-salt' }))).toThrow(
      ConfigValidationError,
    );
  });

  it('accepts IP_HASH_SALT exactly 32 chars (boundary)', () => {
    const cfg = parseEnvConfig(baseEnv({ IP_HASH_SALT: 'y'.repeat(32) }));
    expect(cfg.IP_HASH_SALT?.length).toBe(32);
  });
});

describe('EnvConfigSchema — SAFE_FETCH_MAX_BYTES (P1 #45/#46)', () => {
  it('defaults to 5_000_000 when unset', () => {
    const cfg = parseEnvConfig(baseEnv());
    expect(cfg.SAFE_FETCH_MAX_BYTES).toBe(5_000_000);
  });

  it('coerces a string value to int', () => {
    const cfg = parseEnvConfig(baseEnv({ SAFE_FETCH_MAX_BYTES: '1048576' }));
    expect(cfg.SAFE_FETCH_MAX_BYTES).toBe(1_048_576);
  });

  it('rejects zero and negative caps (positive int constraint)', () => {
    expect(() => parseEnvConfig(baseEnv({ SAFE_FETCH_MAX_BYTES: '0' }))).toThrow(
      ConfigValidationError,
    );
    expect(() => parseEnvConfig(baseEnv({ SAFE_FETCH_MAX_BYTES: '-5' }))).toThrow(
      ConfigValidationError,
    );
  });

  it('rejects non-integer values', () => {
    expect(() => parseEnvConfig(baseEnv({ SAFE_FETCH_MAX_BYTES: '1.5' }))).toThrow(
      ConfigValidationError,
    );
  });
});
