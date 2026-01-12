/**
 * @CacheInvalidate Decorator
 *
 * Method decorator that invalidates cache keys after method execution.
 * Supports multiple keys, patterns, and key interpolation.
 *
 * Kent Beck: "Make it work, make it right, make it fast."
 */

import { CacheService } from '../cache.service';
import { buildCacheKey } from './cacheable.decorator';

// --- Types ---

export interface CacheInvalidateOptions {
  /**
   * Specific cache keys to invalidate.
   * Supports interpolation: {0}, {1} for positional args.
   */
  keys?: string[];

  /**
   * Cache key patterns to invalidate (supports wildcards like *).
   * Supports interpolation: {0}, {1} for positional args.
   */
  patterns?: string[];

  /**
   * When to invalidate: 'before' or 'after' method execution.
   * Default: 'after'
   */
  timing?: 'before' | 'after';
}

// --- Decorator ---

const CACHE_SERVICE_PROPERTY = 'cacheService';

/**
 * Method decorator that invalidates cache keys when method is called.
 *
 * @example
 * ```typescript
 * @Injectable()
 * class UserService {
 *   constructor(private readonly cacheService: CacheService) {}
 *
 *   @CacheInvalidate({ keys: ['user:{0}:profile', 'user:{0}:settings'] })
 *   async updateUser(userId: string, data: UpdateUserDto) {
 *     return this.repository.update(userId, data);
 *   }
 *
 *   @CacheInvalidate({ patterns: ['analytics:*:{0}'] })
 *   async clearUserAnalytics(userId: string) {
 *     // patterns support wildcard invalidation
 *   }
 * }
 * ```
 */
export function CacheInvalidate(
  options: CacheInvalidateOptions,
): MethodDecorator {
  const { keys = [], patterns = [], timing = 'after' } = options;

  return function <T>(
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> | void {
    const originalMethod = descriptor.value as (
      ...args: unknown[]
    ) => Promise<unknown>;

    if (typeof originalMethod !== 'function') {
      throw new Error(
        `@CacheInvalidate can only be applied to methods. Got: ${typeof originalMethod}`,
      );
    }

    descriptor.value = async function (
      this: Record<string, unknown>,
      ...args: unknown[]
    ) {
      const cacheService = this[CACHE_SERVICE_PROPERTY] as
        | CacheService
        | undefined;

      // Helper to perform invalidation
      const invalidate = async () => {
        if (!cacheService) return;

        // Invalidate specific keys
        for (const keyPattern of keys) {
          const key = buildCacheKey(keyPattern, args);
          try {
            await cacheService.delete(key);
          } catch {
            // Ignore cache deletion errors - don't fail the method
          }
        }

        // Invalidate patterns
        for (const patternTemplate of patterns) {
          const pattern = buildCacheKey(patternTemplate, args);
          try {
            await cacheService.deletePattern(pattern);
          } catch {
            // Ignore pattern deletion errors - don't fail the method
          }
        }
      };

      // Invalidate before if specified
      if (timing === 'before') {
        await invalidate();
      }

      // Call original method
      const result: unknown = await originalMethod.apply(this, args);

      // Invalidate after (default)
      if (timing === 'after') {
        await invalidate();
      }

      return result;
    } as T;

    return descriptor;
  };
}
