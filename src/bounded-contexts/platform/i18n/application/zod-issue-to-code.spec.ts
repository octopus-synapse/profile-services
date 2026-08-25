import { describe, expect, it } from 'bun:test';
import { z } from 'zod';
import { zodIssueToCode } from './zod-issue-to-code';

function firstIssue(schema: z.ZodTypeAny, value: unknown) {
  const result = schema.safeParse(value);
  if (result.success) throw new Error('expected a validation failure');
  return zodIssueToCode(result.error.issues[0]);
}

describe('zodIssueToCode', () => {
  it('maps a missing required key to REQUIRED (not MUST_BE_STRING)', () => {
    const out = firstIssue(z.object({ name: z.string() }), {});
    expect(out.code).toBe('REQUIRED');
    expect(out.path).toEqual(['name']);
  });

  it('maps .min(1) on a string to REQUIRED', () => {
    expect(firstIssue(z.string().min(1), '').code).toBe('REQUIRED');
  });

  it('maps .min(n>1) to STRING_TOO_SHORT with {min}', () => {
    const out = firstIssue(z.string().min(2), 'A');
    expect(out.code).toBe('STRING_TOO_SHORT');
    expect(out.params).toEqual({ min: 2 });
  });

  it('maps .max(n) to STRING_TOO_LONG with {max}', () => {
    const out = firstIssue(z.string().max(3), 'ABCD');
    expect(out.code).toBe('STRING_TOO_LONG');
    expect(out.params).toEqual({ max: 3 });
  });

  it('maps .email() to EMAIL_INVALID', () => {
    expect(firstIssue(z.string().email(), 'nope').code).toBe('EMAIL_INVALID');
  });

  it('maps .regex() to PATTERN_MISMATCH', () => {
    expect(firstIssue(z.string().regex(/^a$/), 'b').code).toBe('PATTERN_MISMATCH');
  });

  it('maps enums to ENUM_INVALID with the allowed list', () => {
    const out = firstIssue(z.enum(['A', 'B']), 'C');
    expect(out.code).toBe('ENUM_INVALID');
    expect(out.params).toEqual({ allowed: 'A, B' });
  });

  it('maps a wrong primitive type to MUST_BE_<TYPE>', () => {
    expect(firstIssue(z.string(), 42).code).toBe('MUST_BE_STRING');
  });

  it('uses params.code from custom refinements and strips it from params', () => {
    const schema = z.string().superRefine((v, ctx) => {
      if (!/[0-9]/.test(v))
        ctx.addIssue({
          code: 'custom',
          message: 'x',
          params: { code: 'PASSWORD_NEEDS_DIGIT', n: 1 },
        });
    });
    const out = firstIssue(schema, 'abc');
    expect(out.code).toBe('PASSWORD_NEEDS_DIGIT');
    expect(out.params).toEqual({ n: 1 });
  });

  it('falls back to VALIDATION_GENERIC for custom refinements without a code', () => {
    const schema = z.string().refine(() => false, 'nope');
    expect(firstIssue(schema, 'abc').code).toBe('VALIDATION_GENERIC');
  });
});
