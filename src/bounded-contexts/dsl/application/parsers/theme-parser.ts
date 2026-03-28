/**
 * Theme Parser
 *
 * Parses and validates theme definition objects into ThemeDefinition.
 * Uses Zod schemas for validation and provides detailed error messages.
 */

import { ZodError } from 'zod';
import {
  type ThemeDefinition,
  ThemeDefinitionSchema,
} from '../../domain/schemas/dsl/theme-ast.schema';

/**
 * Error thrown when theme parsing fails.
 */
export class ThemeParseError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly issues: Array<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = 'ThemeParseError';
  }

  static fromZodError(error: ZodError): ThemeParseError {
    const issues = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));

    const firstIssue = issues[0];
    const path = firstIssue?.path || 'unknown';
    const message = `Theme validation failed at "${path}": ${firstIssue?.message || 'Unknown error'}`;

    return new ThemeParseError(message, path, issues);
  }
}

/**
 * Result of theme validation.
 */
export interface ThemeValidationResult {
  success: boolean;
  data?: ThemeDefinition;
  errors?: Array<{ path: string; message: string }>;
}

/**
 * Theme parser with validation.
 */
export const ThemeParser = {
  /**
   * Parse and validate a theme definition object.
   * Throws ThemeParseError if validation fails.
   */
  parse(input: unknown): ThemeDefinition {
    try {
      return ThemeDefinitionSchema.parse(input);
    } catch (error) {
      if (error instanceof ZodError) {
        throw ThemeParseError.fromZodError(error);
      }
      throw error;
    }
  },

  /**
   * Validate a theme definition without throwing.
   * Returns a result object with success status and errors if any.
   */
  validate(input: unknown): ThemeValidationResult {
    const result = ThemeDefinitionSchema.safeParse(input);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    const errors = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));

    return {
      success: false,
      errors,
    };
  },

  /**
   * Check if an object is a valid theme definition.
   */
  isValid(input: unknown): input is ThemeDefinition {
    return ThemeDefinitionSchema.safeParse(input).success;
  },
};
