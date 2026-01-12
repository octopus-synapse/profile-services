/**
 * Zod Validation Pipe
 *
 * NestJS adapter for profile-contracts validation.
 * Translates pure ValidationResult into NestJS BadRequestException.
 *
 * Architecture:
 * - profile-contracts: Pure validation logic (framework-agnostic)
 * - profile-services: Framework adapter (NestJS-specific)
 *
 * This follows the Dependency Rule: frameworks depend on domain, not vice versa.
 */

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ZodSchema } from 'zod';
import { validate, ERROR_CODES } from '@octopus-synapse/profile-contracts';

/**
 * Generic Zod Validation Pipe
 *
 * Validates incoming data against a Zod schema.
 * Throws BadRequestException on validation failure.
 *
 * @example
 * ```typescript
 * import { LoginCredentialsSchema } from '@octopus-synapse/profile-contracts';
 * import { ZodValidationPipe } from './common/validation/zod-validation.pipe';
 *
 * @Post('login')
 * async login(@Body(new ZodValidationPipe(LoginCredentialsSchema)) dto: LoginCredentials) {
 *   return this.authService.login(dto);
 * }
 * ```
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    const result = validate(this.schema, value);

    if (!result.success) {
      throw new BadRequestException({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Validation failed',
          details: {
            errors: result.errors,
          },
        },
      });
    }

    return result.data;
  }
}

/**
 * Factory function for creating validation pipes
 *
 * Provides cleaner syntax in controllers.
 *
 * @example
 * ```typescript
 * @Post('login')
 * async login(@Body(createZodPipe(LoginCredentialsSchema)) dto: LoginCredentials) {}
 * ```
 */
export const createZodPipe = <T>(schema: ZodSchema<T>) =>
  new ZodValidationPipe(schema);
