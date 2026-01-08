/**
 * Zod Validation Pipe
 * Global pipe to replace class-validator across the entire application
 *
 * Usage in controllers:
 *   @Post()
 *   @UsePipes(new ZodValidationPipe(mySchema))
 *   create(@Body() dto: MyDto) {}
 *
 * Or globally in main.ts:
 *   app.useGlobalPipes(new ZodValidationPipe());
 */

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ZodSchema } from 'zod';

/**
 * Metadata key for storing Zod schemas on DTOs
 */
export const ZOD_SCHEMA_KEY = Symbol('ZOD_SCHEMA');

/**
 * Decorator to attach Zod schema to DTO class
 * Usage: @ValidateWith(mySchema) export class MyDto {}
 */
export function ValidateWith(schema: ZodSchema) {
  return function (target: object) {
    Reflect.defineMetadata(ZOD_SCHEMA_KEY, schema, target);
  };
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema?: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    // If schema provided directly to pipe, use it
    if (this.schema) {
      return this.validate(value, this.schema);
    }

    // Otherwise, try to get schema from DTO class metadata
    if (metadata.metatype) {
      const schema = Reflect.getMetadata(ZOD_SCHEMA_KEY, metadata.metatype) as
        | ZodSchema
        | undefined;
      if (schema) {
        return this.validate(value, schema);
      }
    }

    // No schema found, pass through (allows gradual migration)
    return value;
  }

  private validate(value: unknown, schema: ZodSchema): unknown {
    try {
      return schema.parse(value);
    } catch (error) {
      // Use duck-typing instead of instanceof to handle multiple Zod copies
      // (e.g., from profile-contracts vs profile-services node_modules)
      if (this.isZodError(error)) {
        // Format Zod errors to match NestJS ValidationPipe format
        const formattedErrors = error.errors.map((err) => ({
          property: err.path.join('.'),
          constraints: {
            [err.code]: err.message,
          },
        }));

        throw new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          errors: formattedErrors,
        });
      }
      throw error;
    }
  }

  /**
   * Duck-type check for ZodError to handle multiple Zod package instances
   * in monorepo scenarios (profile-contracts vs profile-services)
   */
  private isZodError(
    error: unknown,
  ): error is {
    errors: Array<{ path: string[]; code: string; message: string }>;
  } {
    return (
      error !== null &&
      typeof error === 'object' &&
      'errors' in error &&
      Array.isArray((error as { errors: unknown }).errors) &&
      'name' in error &&
      (error as { name: string }).name === 'ZodError'
    );
  }
}
