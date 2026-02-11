/**
 * Pure Validation Functions
 *
 * Framework-agnostic validation logic.
 * Consumers use these without knowing about Zod internals.
 */

import type { ZodSchema } from 'zod';

/**
 * Validation result abstraction.
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

/**
 * Pure validation function.
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns ValidationResult (success or errors)
 *
 * @example
 * const result = validate(LoginSchema, req.body);
 * if (!result.success) return res.status(400).json(result.errors);
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code,
    })),
  };
}
