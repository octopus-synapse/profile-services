/**
 * Validators Module
 *
 * Exports pure validation functions.
 * NO pre-built validators for each schema (eliminates 316 lines of duplication).
 *
 * Consumers import schemas and create validators on-demand:
 *
 * @example
 * import { validate, LoginSchema } from '@/shared-kernel';
 *
 * const result = validate(LoginSchema, data);
 */

export { validate, validateOrThrow } from "./validator";
export type { ValidationResult, ValidationError } from "./validator";
