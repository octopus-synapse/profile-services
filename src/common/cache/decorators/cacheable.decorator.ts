/**
 * @Cacheable Decorator
 *
 * Method decorator that caches the return value of async methods.
 * Uses cache-aside pattern: check cache first, compute if miss, store result.
 *
 * Key interpolation supports:
 * - Static keys: 'static:key'
 * - Positional: 'user:{0}:profile' (0-indexed arguments)
 * - Named: 'resume:{slug}' (matches argument names or first string arg)
 * - Nested: 'object:{data.id}' (object property access)
 *
 * Kent Beck: "Do the simplest thing that could possibly work."
 */

import { CacheService } from '../cache.service';

// --- Types ---

export interface CacheableOptions {
  /**
   * Cache key pattern.
   * Supports interpolation: {0}, {1} for positional, {name} for named params.
   */
  key: string;

  /**
   * Time-to-live in seconds.
   */
  ttl: number;

  /**
   * Optional condition function to determine if result should be cached.
   * Default: caches all non-null results.
   */
  condition?: (result: unknown) => boolean;
}

// --- Key Builder ---

/**
 * Builds cache key by interpolating placeholders with argument values.
 *
 * @param pattern - Key pattern with placeholders ({0}, {name}, {obj.prop})
 * @param args - Method arguments array
 * @returns Interpolated cache key
 */
export function buildCacheKey(pattern: string, args: unknown[]): string {
  // Track which positional index to use for unnamed placeholders
  let positionalCounter = 0;

  return pattern.replace(/\{([^}]+)\}/g, (_, placeholder: string) => {
    // Check if placeholder is a number (positional argument)
    const positionalIndex = parseInt(placeholder, 10);
    if (!isNaN(positionalIndex) && positionalIndex < args.length) {
      return String(args[positionalIndex]);
    }

    // Check for nested property access (e.g., "data.id")
    if (placeholder.includes('.')) {
      const [objName, ...propertyPath] = placeholder.split('.');

      // Try to find matching object in args by property name
      for (const arg of args) {
        if (typeof arg === 'object' && arg !== null) {
          const objArg = arg as Record<string, unknown>;

          // Direct path from object (e.g., {id} on { id: 'x' })
          const directValue = getNestedValue(objArg, [
            objName,
            ...propertyPath,
          ]);
          if (directValue !== undefined) {
            return String(directValue);
          }
        }
      }

      // Fallback for {data.id} pattern where data is the argument itself
      // This handles cases like {data.id} where the arg IS the data object
      const argIndex = parseInt(objName, 10);
      if (!isNaN(argIndex) && argIndex < args.length) {
        const value = getNestedValue(args[argIndex], propertyPath);
        if (value !== undefined) {
          return String(value);
        }
      }

      // Final fallback: assume first object arg IS the "data" object
      for (const arg of args) {
        if (typeof arg === 'object' && arg !== null) {
          const objArg = arg as Record<string, unknown>;
          const value = getNestedValue(objArg, propertyPath);
          if (value !== undefined) {
            return String(value);
          }
        }
      }
    }

    // Try to match named parameter from args
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      // If arg is a string and this placeholder matches the pattern position
      if (typeof arg === 'string') {
        // For named placeholders like {slug}, {userId}, use positional order
        const result = args[positionalCounter];
        positionalCounter++;
        return String(result);
      }

      // If arg is an object with matching property
      if (typeof arg === 'object' && arg !== null) {
        const objArg = arg as Record<string, unknown>;
        if (placeholder in objArg) {
          return String(objArg[placeholder]);
        }
      }
    }

    // Final fallback: return undefined string
    return String(args[positionalCounter++] ?? 'undefined');
  });
}

/**
 * Gets nested value from object using property path.
 */
function getNestedValue(obj: unknown, path: string[]): unknown {
  let current: unknown = obj;

  for (const key of path) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

// --- Decorator ---

const CACHE_SERVICE_PROPERTY = 'cacheService';

/**
 * Method decorator that caches async method results.
 *
 * Requirements:
 * - Method must be async (returns Promise)
 * - Class must have `cacheService: CacheService` property
 *
 * @example
 * ```typescript
 * @Injectable()
 * class UserService {
 *   constructor(private readonly cacheService: CacheService) {}
 *
 *   @Cacheable({ key: 'user:{0}:profile', ttl: 120 })
 *   async getUserProfile(userId: string) {
 *     return this.repository.findById(userId);
 *   }
 * }
 * ```
 */
export function Cacheable(options: CacheableOptions): MethodDecorator {
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
        `@Cacheable can only be applied to methods. Got: ${typeof originalMethod}`,
      );
    }

    descriptor.value = async function (
      this: Record<string, unknown>,
      ...args: unknown[]
    ) {
      const cacheService = this[CACHE_SERVICE_PROPERTY] as
        | CacheService
        | undefined;

      // If no cache service, just call the original method
      if (!cacheService) {
        return originalMethod.apply(this, args);
      }

      const cacheKey = buildCacheKey(options.key, args);

      try {
        // Try cache first
        const cached = await cacheService.get(cacheKey);
        if (cached !== null && cached !== undefined) {
          return cached;
        }
      } catch {
        // Cache read failed, proceed to call method
      }

      // Call original method
      const result = await originalMethod.apply(this, args);

      // Cache the result (fire-and-forget, don't fail on cache write errors)
      try {
        const shouldCache = options.condition
          ? options.condition(result)
          : result !== null && result !== undefined;

        if (shouldCache) {
          await cacheService.set(cacheKey, result, options.ttl);
        }
      } catch {
        // Cache write failed, ignore (result is still valid)
      }

      return result;
    } as unknown as T;

    return descriptor;
  };
}
