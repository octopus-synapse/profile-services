/**
 * P1 #38: production / staging must fail-fast when the BullMQ queue
 * is misconfigured. Dev / test stay quiet so local boot doesn't
 * require Redis.
 */

import { describe, expect, it, mock } from 'bun:test';
import type { ConfigPort } from '@/shared-kernel/config/config.port';
import { ConfigValidationError } from '@/shared-kernel/config/config.schema';
import { assertBullmqRequiredInProd } from './assert-bullmq-required-in-prod';

const buildConfig = (env: Record<string, string | undefined>): ConfigPort =>
  ({
    get: mock(<T = string>(key: string) => env[key] as T | undefined),
    getOrDefault: mock(<T>(key: string, d: T) => (env[key] as T) ?? d),
  }) as unknown as ConfigPort;

describe('assertBullmqRequiredInProd', () => {
  it('throws in production without REDIS_HOST', () => {
    expect(() =>
      assertBullmqRequiredInProd(buildConfig({ NODE_ENV: 'production', ENABLE_BULLMQ: 'true' })),
    ).toThrow(ConfigValidationError);
  });

  it('throws in production without ENABLE_BULLMQ=true', () => {
    expect(() =>
      assertBullmqRequiredInProd(buildConfig({ NODE_ENV: 'production', REDIS_HOST: 'redis' })),
    ).toThrow(ConfigValidationError);
  });

  it('throws in staging without REDIS_HOST', () => {
    expect(() =>
      assertBullmqRequiredInProd(buildConfig({ NODE_ENV: 'staging', ENABLE_BULLMQ: 'true' })),
    ).toThrow(ConfigValidationError);
  });

  it('error message references ENABLE_BULLMQ / REDIS_HOST so the deploy report is actionable', () => {
    try {
      assertBullmqRequiredInProd(buildConfig({ NODE_ENV: 'production' }));
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigValidationError);
      const msg = (err as ConfigValidationError).message;
      expect(msg).toContain('ENABLE_BULLMQ');
      expect(msg).toContain('REDIS_HOST');
    }
  });

  it('passes in production with both ENABLE_BULLMQ=true and REDIS_HOST set', () => {
    expect(() =>
      assertBullmqRequiredInProd(
        buildConfig({ NODE_ENV: 'production', ENABLE_BULLMQ: 'true', REDIS_HOST: 'redis' }),
      ),
    ).not.toThrow();
  });

  it('passes silently in development regardless of BullMQ config', () => {
    expect(() =>
      assertBullmqRequiredInProd(buildConfig({ NODE_ENV: 'development' })),
    ).not.toThrow();
    expect(() => assertBullmqRequiredInProd(buildConfig({ NODE_ENV: 'test' }))).not.toThrow();
  });
});
