import { describe, expect, test } from 'bun:test';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { findOffenders } from './zod-leaf-walker';

extendZodWithOpenApi(z);

describe('zod-leaf-walker', () => {
  test('reports a leaf primitive inside a ZodObject', () => {
    const schema = z.object({ a: z.string() });
    expect(findOffenders(schema, { schemaName: 'Test' })).toEqual([
      { schemaName: 'Test', path: ['a'], zodType: 'ZodString' },
    ]);
  });

  test('unwraps ZodOptional and reports the inner leaf', () => {
    const schema = z.object({ a: z.string().optional() });
    expect(findOffenders(schema, { schemaName: 'Test' })).toEqual([
      { schemaName: 'Test', path: ['a'], zodType: 'ZodString' },
    ]);
  });

  test('unwraps ZodNullable', () => {
    const schema = z.object({ a: z.string().nullable() });
    expect(findOffenders(schema, { schemaName: 'Test' })).toEqual([
      { schemaName: 'Test', path: ['a'], zodType: 'ZodString' },
    ]);
  });

  test('unwraps ZodDefault', () => {
    const schema = z.object({ a: z.string().default('x') });
    expect(findOffenders(schema, { schemaName: 'Test' })).toEqual([
      { schemaName: 'Test', path: ['a'], zodType: 'ZodString' },
    ]);
  });

  test('unwraps ZodEffects (refine)', () => {
    const schema = z.object({ a: z.string().refine((v) => v.length > 0) });
    expect(findOffenders(schema, { schemaName: 'Test' })).toEqual([
      { schemaName: 'Test', path: ['a'], zodType: 'ZodString' },
    ]);
  });

  test('unwraps stacked wrappers (Optional + Nullable + Default + Effects)', () => {
    const schema = z.object({
      a: z
        .string()
        .refine((v) => v.length > 0)
        .nullable()
        .optional()
        .default(null),
    });
    expect(findOffenders(schema, { schemaName: 'Test' })).toEqual([
      { schemaName: 'Test', path: ['a'], zodType: 'ZodString' },
    ]);
  });

  test('descends into ZodArray element type with [*] path segment', () => {
    const schema = z.object({ tags: z.array(z.string()) });
    expect(findOffenders(schema, { schemaName: 'Test' })).toEqual([
      { schemaName: 'Test', path: ['tags', '[*]'], zodType: 'ZodString' },
    ]);
  });

  test('descends into ZodUnion options', () => {
    const schema = z.object({ value: z.union([z.string(), z.number()]) });
    expect(findOffenders(schema, { schemaName: 'Test' })).toEqual([
      { schemaName: 'Test', path: ['value'], zodType: 'ZodString' },
      { schemaName: 'Test', path: ['value'], zodType: 'ZodNumber' },
    ]);
  });

  test('descends into ZodDiscriminatedUnion variants with discriminator in path', () => {
    const schema = z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('a'), payload: z.string() }),
      z.object({ kind: z.literal('b'), payload: z.number() }),
    ]);
    expect(findOffenders(schema, { schemaName: 'Test' })).toEqual([
      { schemaName: 'Test', path: ['kind=a', 'payload'], zodType: 'ZodString' },
      { schemaName: 'Test', path: ['kind=b', 'payload'], zodType: 'ZodNumber' },
    ]);
  });

  test('treats ZodLiteral as having an implicit example', () => {
    const schema = z.object({ tag: z.literal('foo') });
    expect(findOffenders(schema, { schemaName: 'Test' })).toEqual([]);
  });

  test('treats ZodEnum as having an implicit example', () => {
    const schema = z.object({ status: z.enum(['draft', 'published']) });
    expect(findOffenders(schema, { schemaName: 'Test' })).toEqual([]);
  });

  test('treats ZodNativeEnum as having an implicit example', () => {
    enum Color {
      Red = 'red',
      Green = 'green',
    }
    const schema = z.object({ color: z.nativeEnum(Color) });
    expect(findOffenders(schema, { schemaName: 'Test' })).toEqual([]);
  });

  test('treats ZodNull as having an implicit example (the value `null`)', () => {
    const schema = z.object({ deletedAt: z.null() });
    expect(findOffenders(schema, { schemaName: 'Test' })).toEqual([]);
  });

  test('skips fields annotated with .openapi({ example })', () => {
    const schema = z.object({ a: z.string().openapi({ example: 'x' }) });
    expect(findOffenders(schema, { schemaName: 'Test' })).toEqual([]);
  });

  test('skips fields annotated with .openapi({ examples })', () => {
    const schema = z.object({
      a: z.string().openapi({ examples: ['x', 'y'] }),
    });
    expect(findOffenders(schema, { schemaName: 'Test' })).toEqual([]);
  });

  test('treats passthrough ZodObject as a single leaf without descending', () => {
    const schema = z.object({ data: z.object({}).passthrough() });
    expect(findOffenders(schema, { schemaName: 'Test' })).toEqual([
      { schemaName: 'Test', path: ['data'], zodType: 'ZodObject' },
    ]);
  });

  test('passthrough with .openapi({ example }) generates no offender', () => {
    const schema = z.object({
      data: z
        .object({})
        .passthrough()
        .openapi({ example: { foo: 'bar' } }),
    });
    expect(findOffenders(schema, { schemaName: 'Test' })).toEqual([]);
  });

  test('skips schemas listed in exemptSchemas (recursive bounded patterns)', () => {
    const JsonLeaf = z.union([z.string(), z.number(), z.boolean(), z.null()]);
    const JsonValue: z.ZodTypeAny = z.union([JsonLeaf, z.array(JsonLeaf), z.record(JsonLeaf)]);
    const schema = z.object({ blob: JsonValue });
    expect(findOffenders(schema, { schemaName: 'Test', exemptSchemas: [JsonValue] })).toEqual([]);
  });

  test('exempt is by reference identity — different instance still walks', () => {
    const JsonLeaf = z.union([z.string(), z.number()]);
    const schema = z.object({ blob: JsonLeaf });
    const otherInstance = z.union([z.string(), z.number()]);
    const offenders = findOffenders(schema, {
      schemaName: 'Test',
      exemptSchemas: [otherInstance],
    });
    expect(offenders.length).toBeGreaterThan(0);
  });

  test('auto-derives example via nameToExample map (last path segment match)', () => {
    const schema = z.object({ userId: z.string(), name: z.string() });
    const offenders = findOffenders(schema, {
      schemaName: 'Test',
      nameToExample: new Map([['userId', 'EXAMPLE_USER_ID_VALUE']]),
    });
    expect(offenders).toEqual([{ schemaName: 'Test', path: ['name'], zodType: 'ZodString' }]);
  });

  test('auto-derive matches by leaf field name even when nested in arrays', () => {
    const schema = z.object({
      authors: z.array(z.object({ userId: z.string(), bio: z.string() })),
    });
    const offenders = findOffenders(schema, {
      schemaName: 'Test',
      nameToExample: new Map([['userId', 'EXAMPLE_USER_ID_VALUE']]),
    });
    expect(offenders).toEqual([
      { schemaName: 'Test', path: ['authors', '[*]', 'bio'], zodType: 'ZodString' },
    ]);
  });
});
