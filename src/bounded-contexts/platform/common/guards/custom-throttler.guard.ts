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
   */
  protected override shouldSkip(context: ExecutionContext): Promise<boolean> {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') {
      return Promise.resolve(true);
    }

    // E2E test bypass - check for special header in non-production environments
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      const request = context.switchToHttp().getRequest();
      const hasE2EBypass = request?.headers?.['x-e2e-bypass-rate-limit'] === 'true';
      if (hasE2EBypass) {
        return Promise.resolve(true);
      }
    }

    return Promise.resolve(false);
  }
}
