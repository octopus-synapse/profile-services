/**
 * Custom Throttler Guard
 *
 * Extends NestJS ThrottlerGuard to skip rate limiting in test environment.
 * This allows integration tests to run without hitting rate limits.
 *
 * Kent Beck: "Test setup should be simple and predictable"
 */

import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  /**
   * Skip throttling for test environment to allow integration tests
   * to run without hitting rate limits.
   *
   * Set RATE_LIMIT_ENABLED=true to enable rate limiting in tests
   * for security test verification.
   */
  protected override shouldSkip(context: ExecutionContext): Promise<boolean> {
    const isProduction = process.env.NODE_ENV === 'production';
    const isTest = process.env.NODE_ENV === 'test';

    // E2E test bypass - check for special header in non-production environments
    if (!isProduction) {
      const request = context.switchToHttp().getRequest();
      const hasE2EBypass = request?.headers?.['x-e2e-bypass-rate-limit'] === 'true';
      if (hasE2EBypass) {
        return Promise.resolve(true);
      }
    }

    // In test environment, only enable rate limiting if RATE_LIMIT_ENABLED is set
    // This allows security tests to verify rate limiting while keeping other tests fast
    if (isTest && process.env.RATE_LIMIT_ENABLED !== 'true') {
      return Promise.resolve(true);
    }

    return Promise.resolve(false);
  }
}
