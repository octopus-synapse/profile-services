import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  SectionDefinitionSchema,
  type SectionFieldDefinition,
} from '@/shared-kernel/dtos/semantic-sections.dto';

@Injectable()
export class SectionDefinitionZodFactory {
  buildSchema(definition: unknown): z.ZodType<Record<string, unknown>> {
    const parsed = SectionDefinitionSchema.safeParse(definition);
    if (!parsed.success) {
      throw new BadRequestException('Invalid section type definition');
    }

    const shape: Record<string, z.ZodTypeAny> = {};
    const uniqueKeys = new Set<string>();

    for (const field of parsed.data.fields) {
      if (!field.key) {
        throw new BadRequestException('Top-level section fields must define a key');
      }

      if (uniqueKeys.has(field.key)) {
        throw new BadRequestException(`Duplicated section field key: ${field.key}`);
      }

      uniqueKeys.add(field.key);

      const fieldSchema = this.buildFieldSchema(field, true);
      shape[field.key] = fieldSchema;
    }

    return z.object(shape) as z.ZodType<Record<string, unknown>>;
  }

  private buildFieldSchema(field: SectionFieldDefinition, allowOptional: boolean): z.ZodTypeAny {
    const baseSchema = this.buildFieldNodeSchema(field);
    return this.applyModifiers(baseSchema, field, allowOptional);
  }

  private buildFieldNodeSchema(field: SectionFieldDefinition): z.ZodTypeAny {
    switch (field.type) {
      case 'string':
        return this.applyStringMeta(z.string(), field.meta);
      case 'number':
        return this.applyNumberMeta(z.number(), field.meta);
      case 'boolean':
        return z.boolean();
      case 'date':
        return z.coerce.date();
      case 'enum':
        return this.buildEnumSchema(field);
      case 'array':
        return this.buildArraySchema(field);
      case 'object':
        return this.buildObjectSchema(field);
      default:
        return z.unknown();
    }
  }

  private applyModifiers(
    schema: z.ZodTypeAny,
    field: SectionFieldDefinition,
    allowOptional: boolean,
  ): z.ZodTypeAny {
    let currentSchema = schema;

    if (field.nullable) {
      currentSchema = currentSchema.nullable();
    }

    if (allowOptional && !field.required) {
      currentSchema = currentSchema.optional();
    }

    return currentSchema;
  }

  private buildEnumSchema(field: SectionFieldDefinition): z.ZodTypeAny {
    if (!field.enum || field.enum.length === 0) {
      return z.string();
    }

    const values = [...new Set(field.enum)].filter((value) => value.length > 0);
    if (values.length === 0) {
      return z.string();
    }

    return z.enum(values as [string, ...string[]]);
  }

  private buildArraySchema(field: SectionFieldDefinition): z.ZodTypeAny {
    if (!field.items) {
      return z.array(z.unknown());
    }

    return z.array(this.buildFieldSchema(field.items, false));
  }

  private buildObjectSchema(field: SectionFieldDefinition): z.ZodTypeAny {
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const nestedField of field.fields ?? []) {
      if (!nestedField.key) {
        throw new BadRequestException('Nested object fields must define a key');
      }

      shape[nestedField.key] = this.buildFieldSchema(nestedField, true);
    }

    return z.object(shape);
  }

  private applyStringMeta(schema: z.ZodString, meta?: Record<string, unknown>): z.ZodString {
    let currentSchema = schema;

    const minLength = this.parseNumber(meta?.minLength);
    const maxLength = this.parseNumber(meta?.maxLength);

    if (minLength !== undefined) {
      currentSchema = currentSchema.min(minLength);
    }

    if (maxLength !== undefined) {
      currentSchema = currentSchema.max(maxLength);
    }

    if (meta?.format === 'uri') {
      currentSchema = currentSchema.url();
    }

    return currentSchema;
  }

  private applyNumberMeta(schema: z.ZodNumber, meta?: Record<string, unknown>): z.ZodNumber {
    let currentSchema = schema;

    const min = this.parseNumber(meta?.min);
    const max = this.parseNumber(meta?.max);

    if (min !== undefined) {
      currentSchema = currentSchema.min(min);
    }

    if (max !== undefined) {
      currentSchema = currentSchema.max(max);
    }

    return currentSchema;
  }

  private parseNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    return undefined;
  }
}
