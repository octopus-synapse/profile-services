import { describe, expect, it } from 'bun:test';
import { DictionaryProjectorService } from '../../dictionary-projector.service';
import { GetDictionaryUseCase } from './get-dictionary.use-case';

describe('GetDictionaryUseCase', () => {
  const useCase = new GetDictionaryUseCase(new DictionaryProjectorService());

  it('projects errors for the requested locale', () => {
    const result = useCase.execute('errors', 'pt-BR');
    expect(result.kind).toBe('errors');
    if (result.kind !== 'errors') throw new Error('unreachable');
    expect(result.entries.ENTITY_NOT_FOUND).toContain('não');
  });

  it('projects enums', () => {
    const result = useCase.execute('enums', 'en');
    expect(result.kind).toBe('enums');
  });

  it('projects notifications with params arrays', () => {
    const result = useCase.execute('notifications', 'en');
    expect(result.kind).toBe('notifications');
    if (result.kind !== 'notifications') throw new Error('unreachable');
    expect(Object.values(result.entries)[0]?.params).toBeInstanceOf(Array);
  });
});
