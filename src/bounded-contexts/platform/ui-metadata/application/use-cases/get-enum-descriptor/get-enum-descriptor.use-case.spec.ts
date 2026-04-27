import { describe, expect, it } from 'bun:test';
import { GetEnumDescriptorUseCase } from './get-enum-descriptor.use-case';

describe('GetEnumDescriptorUseCase', () => {
  it('returns a descriptor with localized labels for known keys', () => {
    const result = new GetEnumDescriptorUseCase().execute('notification-types');

    expect(result).not.toBeNull();
    expect(result?.key).toBe('notification-types');
    expect(result?.values.length).toBeGreaterThan(0);
    const first = result?.values[0];
    expect(first?.labels['pt-BR']).toBeString();
    expect(first?.labels.en).toBeString();
  });

  it('returns null for unknown keys', () => {
    expect(new GetEnumDescriptorUseCase().execute('does-not-exist')).toBeNull();
  });
});
