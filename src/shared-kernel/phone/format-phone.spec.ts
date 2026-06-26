import { describe, expect, it } from 'bun:test';
import { formatPhoneForDisplay } from './format-phone';

describe('formatPhoneForDisplay', () => {
  it('formats a BR mobile E.164 number with country-aware national grouping', () => {
    expect(formatPhoneForDisplay('+5511978833101')).toBe('+55 (11) 97883-3101');
  });

  it('formats a BR landline E.164 number', () => {
    expect(formatPhoneForDisplay('+551133334444')).toBe('+55 (11) 3333-4444');
  });

  it('formats a US E.164 number', () => {
    expect(formatPhoneForDisplay('+12015550123')).toBe('+1 (201) 555-0123');
  });

  it('returns null for empty / nullish input', () => {
    expect(formatPhoneForDisplay(null)).toBeNull();
    expect(formatPhoneForDisplay(undefined)).toBeNull();
    expect(formatPhoneForDisplay('')).toBeNull();
    expect(formatPhoneForDisplay('   ')).toBeNull();
  });

  it('falls back to the raw value for legacy non-E.164 / unparseable input', () => {
    // Legacy BR mask stored by profile-edit (no country code).
    expect(formatPhoneForDisplay('(11) 99999-9999')).toBe('(11) 99999-9999');
    // Junk that libphonenumber can't make sense of.
    expect(formatPhoneForDisplay('12345')).toBe('12345');
  });
});
