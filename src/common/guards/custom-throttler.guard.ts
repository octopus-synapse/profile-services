/**
 * Custom Throttler Guard
 *
 * Extends NestJS ThrottlerGuard to skip rate limiting in test environment.
 * This allows integration tests to run without hitting rate limits.
 *
 * Kent Beck: "Test setup should be simple and predictable"
 */

import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  /**
   * Skip throttling for test environment to allow integration tests
   * to run without hitting rate limits.
   */
  protected override async shouldSkip(
    _context: ExecutionContext,
  ): Promise<boolean> {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') {
      return true;
    }

    return false;
  }
}
