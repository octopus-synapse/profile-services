/**
 * DSL Validator Service
 * Validates Resume DSL using Zod schemas from @octopus-synapse/profile-contracts
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import {
  ResumeDslSchema,
  type ResumeDsl,
} from '@octopus-synapse/profile-contracts';
import { ZodError } from 'zod';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  normalized?: ResumeDsl;
}

@Injectable()
export class DslValidatorService {
  /**
   * Validate a DSL object against the schema
   */
  validate(input: unknown): ValidationResult {
    try {
      const normalized = ResumeDslSchema.parse(input);
      return { valid: true, normalized };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          valid: false,
          errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        };
      }
      throw error;
    }
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
    return result.normalized!;
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
