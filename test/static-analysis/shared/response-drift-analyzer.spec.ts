import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { analyzeDrift } from './response-drift-analyzer';

describe('analyzeDrift', () => {
  test('schema matches body exactly → no drift', () => {
    const schema = z.object({ a: z.string() });
    expect(analyzeDrift(schema, { a: 'x' })).toEqual([]);
  });

  test('extra field in body not declared in schema', () => {
    const schema = z.object({ a: z.string() });
    expect(analyzeDrift(schema, { a: 'x', b: 1 })).toEqual([{ kind: 'extra-field', path: ['b'] }]);
  });

  test('missing required field', () => {
    const schema = z.object({ a: z.string(), b: z.number() });
    expect(analyzeDrift(schema, { a: 'x' })).toEqual([
      { kind: 'missing-field', path: ['b'], expected: 'ZodNumber' },
    ]);
  });

  test('field is null but schema is required (not nullable)', () => {
    const schema = z.object({ a: z.string() });
    expect(analyzeDrift(schema, { a: null })).toEqual([
      { kind: 'should-be-nullable', path: ['a'] },
    ]);
  });

  test('nullable schema with null body → no drift', () => {
    const schema = z.object({ a: z.string().nullable() });
    expect(analyzeDrift(schema, { a: null })).toEqual([]);
  });

  test('optional schema with missing body field → no drift', () => {
    const schema = z.object({ a: z.string(), b: z.number().optional() });
    expect(analyzeDrift(schema, { a: 'x' })).toEqual([]);
  });

  test('type mismatch: schema expects number, body has string', () => {
    const schema = z.object({ a: z.number() });
    expect(analyzeDrift(schema, { a: '1' })).toEqual([
      { kind: 'type-mismatch', path: ['a'], expected: 'ZodNumber', actual: 'string' },
    ]);
  });

  test('nested objects are walked recursively', () => {
    const schema = z.object({ user: z.object({ name: z.string() }) });
    expect(analyzeDrift(schema, { user: { name: 'x', extra: 1 } })).toEqual([
      { kind: 'extra-field', path: ['user', 'extra'] },
    ]);
  });

  test('arrays: each element compared against element schema', () => {
    const schema = z.object({ items: z.array(z.object({ id: z.string() })) });
    expect(analyzeDrift(schema, { items: [{ id: 'a' }, { id: 'b', extra: 1 }] })).toEqual([
      { kind: 'extra-field', path: ['items', '[1]', 'extra'] },
    ]);
  });

  test('Date object in body, schema expects string with datetime format → no drift after JSON.stringify', () => {
    const schema = z.object({ createdAt: z.string().datetime() });
    expect(analyzeDrift(schema, { createdAt: '2026-05-07T00:00:00.000Z' })).toEqual([]);
  });
});
