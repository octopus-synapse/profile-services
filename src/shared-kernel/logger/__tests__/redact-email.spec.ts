import { describe, expect, it } from 'bun:test';
import { redactEmail } from '../redact-email';

describe('redactEmail (P0-007/008, P2-#8)', () => {
  it('keeps the first character + domain, replaces local middle', () => {
    expect(redactEmail('john.doe@example.com')).toBe('j***@example.com');
  });

  it('drops the local-part hint entirely for 1-char local-parts (no PII leak)', () => {
    expect(redactEmail('j@e.com')).toBe('***@e.com');
  });

  it('drops the local-part hint for 2-char local-parts too', () => {
    expect(redactEmail('ab@e.com')).toBe('***@e.com');
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
