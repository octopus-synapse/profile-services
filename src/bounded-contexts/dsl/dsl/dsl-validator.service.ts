/**
 * DSL Validator Service
 * Validates Resume DSL using Zod schemas from @/shared-kernel
 *
 * IMPORTANT: No direct imports from 'zod' - all validation comes from contracts.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { type ResumeDsl, ResumeDslSchema } from '@/shared-kernel';

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
      throw new BadRequestException({
        message: 'Invalid DSL',
        errors: result.errors,
      });
    }
    if (!result.normalized) {
      throw new BadRequestException('Validation succeeded but normalized DSL is missing');
    }
    return result.normalized;
  }

  /**
   * Check if a DSL version is supported
   */
  isSupportedVersion(version: string): boolean {
    const supported = ['1.0.0'];
    return supported.includes(version);
  }

  /**
   * Migrate DSL from old version to current
   * TODO: Implement version migration logic
   */
  migrate(dsl: ResumeDsl, targetVersion: string): ResumeDsl {
    if (dsl.version === targetVersion) {
      return dsl;
    }
    // Future: Add migration logic here
    // v1 → v2, v2 → v3, etc.
    return dsl;
  }
}
