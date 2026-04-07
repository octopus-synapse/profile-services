/**
 * GetActiveSpokenLanguagesUseCase Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  createSpokenLanguage,
  DEFAULT_SPOKEN_LANGUAGES,
  InMemorySpokenLanguageRepository,
} from '../../../../testing';
import { SpokenLanguagesRepository } from '../../../infrastructure/adapters/persistence/spoken-languages.repository';
import { GetActiveSpokenLanguagesUseCase } from './get-active-spoken-languages.use-case';

describe('GetActiveSpokenLanguagesUseCase', () => {
  let useCase: GetActiveSpokenLanguagesUseCase;
  let languageRepo: InMemorySpokenLanguageRepository;

  beforeEach(() => {
    languageRepo = new InMemorySpokenLanguageRepository();
    languageRepo.seed(DEFAULT_SPOKEN_LANGUAGES);
    const repository = new SpokenLanguagesRepository(languageRepo as never);
    useCase = new GetActiveSpokenLanguagesUseCase(repository);
  });

  it('should return all active languages ordered by order field', async () => {
    const result = await useCase.execute();

    expect(result).toHaveLength(4);
    expect(result[0].code).toBe('en');
    expect(result[0].nameEn).toBe('English');
    expect(result[1].code).toBe('pt');
    expect(result[1].nameEn).toBe('Portuguese');
    expect(result[2].code).toBe('es');
    expect(result[2].nameEn).toBe('Spanish');
    expect(result[3].code).toBe('fr');
    expect(result[3].nameEn).toBe('French');
  });

  it('should filter out inactive languages', async () => {
    languageRepo.clear();
    languageRepo.add(createSpokenLanguage({ code: 'en', nameEn: 'English', isActive: true }));
    languageRepo.add(createSpokenLanguage({ code: 'de', nameEn: 'German', isActive: false }));
    languageRepo.add(createSpokenLanguage({ code: 'fr', nameEn: 'French', isActive: true }));

    const result = await useCase.execute();

    expect(result).toHaveLength(2);
    expect(result.some((l) => l.code === 'en')).toBe(true);
    expect(result.some((l) => l.code === 'fr')).toBe(true);
    expect(result.some((l) => l.code === 'de')).toBe(false);
  });

  it('should return empty array when no languages found', async () => {
    languageRepo.clear();

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });

  it('should handle null nativeName correctly', async () => {
    languageRepo.clear();
    languageRepo.add(
      createSpokenLanguage({
        code: 'eo',
        nameEn: 'Esperanto',
        namePtBr: 'Esperanto',
        nameEs: 'Esperanto',
        nativeName: null,
      }),
    );

    const result = await useCase.execute();

    expect(result[0].nativeName).toBeNull();
  });
});
