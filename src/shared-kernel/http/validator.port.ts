/**
 * Framework-free validation port. Wraps the existing pure `validate`
 * helper from `shared-kernel/validation` and exposes the three
 * surfaces a Route adapter needs: body / query / params.
 *
 * The Nest `ZodValidationPipe` keeps existing semantics by delegating
 * to `defaultValidator` and converting failures into the existing
 * `BadRequestException` shape.
 */

import type { ZodSchema } from 'zod';
import { validate, type ValidationError, type ValidationResult } from '../validation';

export abstract class ValidatorPort {
  abstract validate<T>(schema: ZodSchema<T>, raw: unknown): ValidationResult<T>;
}

/** The pure validator — usable from anywhere. The Nest adapter and
 *  every framework-free pipeline stage consume this same instance. */
export const defaultValidator: ValidatorPort = {
  validate(schema, raw) {
    return validate(schema, raw);
  },
};

/** Helper that throws a generic `Error` on failure — used by route
 *  handler dispatch when the host adapter doesn't translate to a
 *  framework-specific exception (Elysia/Fastify). The Nest pipe stays
 *  with `BadRequestException` for back-compat. */
export class RouteValidationError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super('Validation failed');
    this.name = 'RouteValidationError';
  }
}

export function parseOrThrow<T>(schema: ZodSchema<T>, raw: unknown): T {
  const result = defaultValidator.validate(schema, raw);
  if (!result.success) throw new RouteValidationError(result.errors);
  return result.data;
}
