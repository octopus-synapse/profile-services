import { describe, expect, it } from 'bun:test';
import { isValidUsernameFormat } from '../../../domain/value-objects/username-rules.const';
import { GetUsernameRulesUseCase } from './get-username-rules.use-case';

describe('GetUsernameRulesUseCase', () => {
  const useCase = new GetUsernameRulesUseCase();

  it('returns numeric min/max + non-empty regex sources', () => {
    const rules = useCase.execute();
    expect(rules.minLength).toBeGreaterThan(0);
    expect(rules.maxLength).toBeGreaterThan(rules.minLength);
    expect(rules.pattern.length).toBeGreaterThan(0);
    expect(rules.startsWithPattern.length).toBeGreaterThan(0);
    expect(rules.endsWithPattern.length).toBeGreaterThan(0);
    expect(rules.forbiddenSubstring).toBe('__');
  });

  it('exposes regex sources that compile and match the same valid usernames the backend accepts', () => {
    const rules = useCase.execute();
    const pattern = new RegExp(rules.pattern);
    const startsWith = new RegExp(rules.startsWithPattern);
    const endsWith = new RegExp(rules.endsWithPattern);

    const valid = ['enzo', 'enzo_dev', 'a3b', 'test_123'];
    for (const u of valid) {
      expect(pattern.test(u)).toBe(true);
      expect(startsWith.test(u)).toBe(true);
      expect(endsWith.test(u)).toBe(true);
      expect(u.includes(rules.forbiddenSubstring)).toBe(false);
      expect(u.length).toBeGreaterThanOrEqual(rules.minLength);
      expect(u.length).toBeLessThanOrEqual(rules.maxLength);
      expect(isValidUsernameFormat(u)).toBe(true);
    }
  });

  it('regex sources reject the same invalid usernames the backend rejects', () => {
    const rules = useCase.execute();
    const cases = [
      'Enzo Patti', // uppercase + space
      'ab', // too short
      '_enzo', // leading underscore
      'enzo_', // trailing underscore
      'enzo__dev', // double underscore
      'a'.repeat(rules.maxLength + 1), // too long
      'enzo-dev', // hyphen not allowed
      'enzo@dev', // special char
    ];
    for (const u of cases) {
      expect(isValidUsernameFormat(u)).toBe(false);
    }
  });
});
