import { describe, expect, it } from 'bun:test';
import { redactEmail } from '../redact-email';

describe('redactEmail (P0-007/008)', () => {
  it('keeps the first character + domain, replaces local middle', () => {
    expect(redactEmail('john.doe@example.com')).toBe('j***@example.com');
  });

  it('handles single-char local-part', () => {
    expect(redactEmail('j@e.com')).toBe('j***@e.com');
  });

  it('returns <empty> for empty / null / undefined', () => {
    expect(redactEmail('')).toBe('<empty>');
    expect(redactEmail(null)).toBe('<empty>');
    expect(redactEmail(undefined)).toBe('<empty>');
  });

  it('returns <redacted> for malformed inputs (no @ or @ at start)', () => {
    expect(redactEmail('not-an-email')).toBe('<redacted>');
    expect(redactEmail('@bad.com')).toBe('<redacted>');
  });
});
