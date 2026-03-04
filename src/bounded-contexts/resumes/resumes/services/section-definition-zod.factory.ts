import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  type SectionDefinition,
  SectionDefinitionSchema,
  type SectionFieldDefinition,
} from '@/shared-kernel/dtos/semantic-sections.dto';

/**
 * Factory that dynamically builds Zod validation schemas from SectionType definitions.
 *
 * This is a core component of the section-agnostic architecture:
 * - Code doesn't know what "experience" or "education" fields are
 * - All field knowledge comes from SectionType.definition (DB)
 * - Validation rules are driven by the definition, not hardcoded
 */
@Injectable()
export class SectionDefinitionZodFactory {
  private readonly schemaCache = new Map<string, z.ZodType<Record<string, unknown>>>();

  /**
   * Build a Zod schema from a section definition.
   * Results are cached by definition content hash for performance.
   */
  buildSchema(definition: unknown): z.ZodType<Record<string, unknown>> {
    const parsed = SectionDefinitionSchema.safeParse(definition);
    if (!parsed.success) {
      throw new BadRequestException('Invalid section type definition');
    }

    // Cache by content hash to handle same kind with different fields
    const cacheKey = this.computeCacheKey(parsed.data);
    const cached = this.schemaCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const schema = this.buildSchemaFromParsed(parsed.data);
    this.schemaCache.set(cacheKey, schema);
    return schema;
  }

  /**
   * Compute a cache key from definition content.
   */
  private computeCacheKey(definition: SectionDefinition): string {
    // Use full JSON for deterministic caching - different field definitions = different schema
    return JSON.stringify({
      kind: definition.kind,
      version: definition.schemaVersion,
      fields: definition.fields,
    });
  }

  /**
   * Build schema from already-parsed definition.
   * Use when you've already validated the definition.
   */
  buildSchemaFromParsed(definition: SectionDefinition): z.ZodType<Record<string, unknown>> {
    const shape: Record<string, z.ZodTypeAny> = {};
    const uniqueKeys = new Set<string>();

    for (const field of definition.fields) {
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

  /**
   * Validate content against a section definition.
   * Returns validation result with detailed errors.
   */
  validateContent(
    definition: unknown,
    content: unknown,
  ): { success: true; data: Record<string, unknown> } | { success: false; errors: z.ZodError } {
    const schema = this.buildSchema(definition);
    const result = schema.safeParse(content);

    if (result.success) {
      return { success: true, data: result.data };
    }

    return { success: false, errors: result.error };
  }

  /**
   * Clear the schema cache.
   * Call when section type definitions are updated.
   */
  clearCache(): void {
    this.schemaCache.clear();
  }

  /**
   * Clear cache for a specific section kind.
   */
  clearCacheForKind(kind: string): void {
    for (const key of this.schemaCache.keys()) {
      if (key.includes(`"kind":"${kind}"`)) {
        this.schemaCache.delete(key);
      }
    }
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

    let arraySchema = z.array(this.buildFieldSchema(field.items, false));

    // Apply array constraints from meta
    const minItems = this.parseNumber(field.meta?.minItems);
    const maxItems = this.parseNumber(field.meta?.maxItems);

    if (minItems !== undefined) {
      arraySchema = arraySchema.min(minItems);
    }

    if (maxItems !== undefined) {
      arraySchema = arraySchema.max(maxItems);
    }

    return arraySchema;
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

    // Support common formats
    const format = meta?.format;
    if (format === 'uri' || format === 'url') {
      currentSchema = currentSchema.url();
    } else if (format === 'email') {
      currentSchema = currentSchema.email();
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
