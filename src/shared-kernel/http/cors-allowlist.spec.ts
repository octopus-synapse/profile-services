import { describe, expect, it } from 'bun:test';
import type { ConfigPort } from '../config';
import type { EnvConfig } from '../config/config.schema';
import {
  buildCorsAllowlist,
  CorsAllowlistMissingError,
  DEFAULT_DEV_CORS_ALLOWLIST,
} from './cors-allowlist';

function buildConfig(
  env: Partial<EnvConfig>,
  raw: Record<string, string | undefined> = {},
): ConfigPort {
  const fullEnv: EnvConfig = {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://test/test',
    BCRYPT_COST: 12,
    ...env,
  } as EnvConfig;
  return {
    env: fullEnv,
    get<T>(key: string): T | undefined {
      return raw[key] as T | undefined;
    },
    getOrDefault<T>(key: string, defaultValue: T): T {
      return (raw[key] as T | undefined) ?? defaultValue;
    },
  };
}

describe('buildCorsAllowlist', () => {
  it('returns the development defaults when nothing is configured in dev', () => {
    const list = buildCorsAllowlist(buildConfig({ NODE_ENV: 'development' }));
    expect(list).toEqual([...DEFAULT_DEV_CORS_ALLOWLIST]);
  });

  it('returns the development defaults in test env when nothing is configured', () => {
    const list = buildCorsAllowlist(buildConfig({ NODE_ENV: 'test' }));
    expect(list).toEqual([...DEFAULT_DEV_CORS_ALLOWLIST]);
  });

  it('throws in production when no allowlist is provided', () => {
    expect(() => buildCorsAllowlist(buildConfig({ NODE_ENV: 'production' }))).toThrow(
      CorsAllowlistMissingError,
    );
  });

  it('throws in staging when no allowlist is provided', () => {
    expect(() => buildCorsAllowlist(buildConfig({ NODE_ENV: 'staging' }))).toThrow(
      CorsAllowlistMissingError,
    );
  });

  it('returns the explicit CORS_ORIGIN list when set', () => {
    const list = buildCorsAllowlist(
      buildConfig({ NODE_ENV: 'production', CORS_ORIGIN: 'https://a.com, https://b.com' }),
    );
    expect(list).toEqual(['https://a.com', 'https://b.com']);
  });

  it('merges CORS_ALLOWED_ORIGINS into CORS_ORIGIN, de-duplicating', () => {
    const list = buildCorsAllowlist(
      buildConfig({
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://a.com',
        CORS_ALLOWED_ORIGINS: 'https://a.com,https://c.com',
      } as Partial<EnvConfig>),
    );
    expect(list).toEqual(['https://a.com', 'https://c.com']);
  });

  it('always includes APP_URL and PUBLIC_APP_URL when set', () => {
    const list = buildCorsAllowlist(
      buildConfig({
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://api.example.com',
        APP_URL: 'https://app.example.com',
        PUBLIC_APP_URL: 'https://www.example.com',
      } as Partial<EnvConfig>),
    );
    expect(list).toContain('https://api.example.com');
    expect(list).toContain('https://app.example.com');
    expect(list).toContain('https://www.example.com');
  });

  it('NEVER returns true (origin-reflection)', () => {
    const list = buildCorsAllowlist(buildConfig({ NODE_ENV: 'development' }));
    // Type-level: function signature is `string[]`; runtime contract
    // here pins it so a future regression that returns a boolean
    // explodes at the assertion.
    expect(Array.isArray(list)).toBe(true);
  });
});
