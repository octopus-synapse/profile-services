import { describe, expect, it } from 'bun:test';
import { z } from 'zod';
import { readJsonColumn, toPrismaJson } from './json-column';

describe('readJsonColumn', () => {
  it('returns the value typed as T when no schema is given', () => {
    const raw: unknown = { a: 1, b: 'x' };
    const out = readJsonColumn<{ a: number; b: string }>(raw);
    expect(out).toEqual({ a: 1, b: 'x' });
  });

  it('validates and returns the parsed value when a schema is given', () => {
    const schema = z.object({ n: z.number() });
    const out = readJsonColumn({ n: 42 }, schema);
    expect(out).toEqual({ n: 42 });
  });

  it('throws when the value fails the schema', () => {
    const schema = z.object({ n: z.number() });
    expect(() => readJsonColumn({ n: 'not-a-number' }, schema)).toThrow();
  });

  it('passes null through when no schema is given', () => {
    expect(readJsonColumn<unknown>(null)).toBeNull();
  });
});

describe('toPrismaJson', () => {
  it('returns the same reference for a JSON-serializable object', () => {
    const v = { bigFive: { openness: 1 } };
    expect(toPrismaJson(v)).toBe(v);
  });

  it('handles arrays', () => {
    const arr = [1, 2, 3];
    expect(toPrismaJson(arr)).toBe(arr);
  });
});
