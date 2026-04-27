import { describe, expect, it } from 'bun:test';
import { ListEnumKeysUseCase } from './list-enum-keys.use-case';

describe('ListEnumKeysUseCase', () => {
  it('returns the catalog keys', () => {
    const result = new ListEnumKeysUseCase().execute();

    expect(result.keys).toContain('notification-types');
    expect(result.keys).toContain('job-application-event-types');
    expect(result.keys).toContain('email-delivery-modes');
  });

  it('does not return duplicates', () => {
    const { keys } = new ListEnumKeysUseCase().execute();
    expect(new Set(keys).size).toBe(keys.length);
  });
});
