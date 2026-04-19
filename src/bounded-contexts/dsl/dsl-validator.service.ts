/**
 * DSL Validator Service
 * Validates Resume DSL using Zod schemas from @/shared-kernel
 *
 * IMPORTANT: No direct imports from 'zod' - all validation comes from contracts.
 */

import { Injectable } from '@nestjs/common';
import { type ResumeDsl, ResumeDslSchema } from '@/bounded-contexts/dsl/domain/schemas/dsl';
import { ValidationException } from '@/shared-kernel/exceptions/domain.exceptions';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  normalized?: ResumeDsl;
}

@Injectable()
export class DslValidatorService {
  /**
   * Validate a DSL object against the schema
   * Uses safeParse to avoid needing to import ZodError directly
   */
  validate(input: unknown): ValidationResult {
    const result = ResumeDslSchema.safeParse(input);

    if (result.success) {
      return { valid: true, normalized: result.data };
    }

    // Convert Zod errors to string array without importing ZodError
    return {
      valid: false,
      errors: result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
    };
  }

  /**
   * Validate and throw if invalid
   */
  validateOrThrow(input: unknown): ResumeDsl {
    const result = this.validate(input);
    if (!result.valid) {
      throw new ValidationException('Invalid DSL', {
        dsl: result.errors ?? [],
      });
    }
    if (!result.normalized) {
      throw new ValidationException('Validation succeeded but normalized DSL is missing');
    }
    return result.normalized;
  }

  /**
   * Check if a DSL version is supported
   */
  isSupportedVersion(version: string): boolean {
    return SUPPORTED_VERSIONS.includes(version);
  }

  /**
   * Migrate DSL from an older version to the target. Uses a forward-only
   * chain of single-step migrators. Each migrator bumps the version by one
   * minor, so migrating v1.0.0 → v1.2.0 runs the v1.0.0→v1.1.0 migrator, then
   * the v1.1.0→v1.2.0 one.
   */
  migrate(dsl: ResumeDsl, targetVersion: string): ResumeDsl {
    if (!this.isSupportedVersion(targetVersion)) {
      throw new ValidationException(`Target DSL version ${targetVersion} is not supported`);
    }

    let current: ResumeDsl = dsl;
    let guard = 0;
    while (current.version !== targetVersion) {
      const step = MIGRATIONS[current.version];
      if (!step) {
        throw new ValidationException(
          `No migration path from ${current.version} to ${targetVersion}`,
        );
      }
      current = step(current);
      guard += 1;
      if (guard > 20) {
        throw new ValidationException('Migration loop detected');
      }
    }
    return current;
  }
}

/** Ordered supported versions. Newest last. */
const SUPPORTED_VERSIONS: string[] = ['1.0.0'];

/**
 * One-step forward migrators. Each function takes a DSL at version `K` and
 * returns the same DSL upgraded to version `K+1`. When adding v1.1.0, append
 * it to `SUPPORTED_VERSIONS` and register the `'1.0.0'` migrator here.
 */
const MIGRATIONS: Record<string, (dsl: ResumeDsl) => ResumeDsl> = {
  // Example (left as documentation until v1.1.0 lands):
  // '1.0.0': (dsl) => ({ ...dsl, version: '1.1.0', /* field moves */ }),
};
