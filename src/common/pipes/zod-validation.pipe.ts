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
import { ZodSchema, ZodError } from 'zod';

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
      if (error instanceof ZodError) {
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
}
