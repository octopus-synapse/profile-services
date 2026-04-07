/**
 * GetSpokenLanguageByCodeUseCase Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  createSpokenLanguage,
  DEFAULT_SPOKEN_LANGUAGES,
  InMemorySpokenLanguageRepository,
} from '../../../../testing';
import { SpokenLanguagesRepository } from '../../../infrastructure/adapters/persistence/spoken-languages.repository';
import { GetSpokenLanguageByCodeUseCase } from './get-spoken-language-by-code.use-case';

describe('GetSpokenLanguageByCodeUseCase', () => {
  let useCase: GetSpokenLanguageByCodeUseCase;
  let languageRepo: InMemorySpokenLanguageRepository;

  beforeEach(() => {
    languageRepo = new InMemorySpokenLanguageRepository();
    languageRepo.seed(DEFAULT_SPOKEN_LANGUAGES);
    const repository = new SpokenLanguagesRepository(languageRepo as never);
    useCase = new GetSpokenLanguageByCodeUseCase(repository);
  });

  it('should return language by code', async () => {
    const result = await useCase.execute('en');

    expect(result).not.toBeNull();
    expect(result?.code).toBe('en');
    expect(result?.nameEn).toBe('English');
    expect(result?.namePtBr).toBe('Inglês');
    expect(result?.nameEs).toBe('Inglés');
    expect(result?.nativeName).toBe('English');
  });

  it('should return null when language not found', async () => {
    const result = await useCase.execute('nonexistent');

    expect(result).toBeNull();
  });

  it('should handle language with null native name', async () => {
    languageRepo.add(
      createSpokenLanguage({
        code: 'la',
        nameEn: 'Latin',
        namePtBr: 'Latim',
        nameEs: 'Latín',
        nativeName: null,
      }),
    );

    const result = await useCase.execute('la');

    expect(result).not.toBeNull();
    expect(result?.nativeName).toBeNull();
  });

  it('should query by exact code', async () => {
    languageRepo.add(
      createSpokenLanguage({
        code: 'pt-BR',
        nameEn: 'Brazilian Portuguese',
        namePtBr: 'Português Brasileiro',
        nameEs: 'Portugués Brasileño',
      }),
    );

    const result = await useCase.execute('pt-BR');

    expect(result).not.toBeNull();
    expect(result?.code).toBe('pt-BR');
  });
});
