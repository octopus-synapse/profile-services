/**
 * SearchSpokenLanguagesUseCase Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  createSpokenLanguage,
  DEFAULT_SPOKEN_LANGUAGES,
  InMemorySpokenLanguageRepository,
} from '../../../../testing';
import { SearchSpokenLanguagesUseCase } from './search-spoken-languages.use-case';

describe('SearchSpokenLanguagesUseCase', () => {
  let useCase: SearchSpokenLanguagesUseCase;
  let languageRepo: InMemorySpokenLanguageRepository;

  beforeEach(() => {
    languageRepo = new InMemorySpokenLanguageRepository();
    languageRepo.seed(DEFAULT_SPOKEN_LANGUAGES);
    useCase = new SearchSpokenLanguagesUseCase(languageRepo);
  });

  it('should search languages by English name case-insensitively', async () => {
    const result = await useCase.execute('port');

    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('pt');
    expect(result[0].nameEn).toBe('Portuguese');
  });

  it('should search languages by Portuguese name', async () => {
    const result = await useCase.execute('inglês');

    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('en');
    expect(result[0].nameEn).toBe('English');
    expect(result[0].namePtBr).toBe('Inglês');
  });

  it('should search languages by Spanish name', async () => {
    const result = await useCase.execute('español');

    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('es');
    expect(result[0].nameEs).toBe('Español');
  });

  it('should search languages by native name', async () => {
    const result = await useCase.execute('français');

    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('fr');
    expect(result[0].nameEn).toBe('French');
    expect(result[0].nativeName).toBe('Français');
  });

  it('should apply default limit when not specified', async () => {
    languageRepo.clear();
    for (let i = 0; i < 15; i++) {
      languageRepo.add(
        createSpokenLanguage({
          code: `lang${i}`,
          nameEn: `Language ${i}`,
          order: i,
        }),
      );
    }

    const result = await useCase.execute('language');

    expect(result.length).toBeLessThanOrEqual(10);
  });

  it('should respect custom limit parameter', async () => {
    languageRepo.clear();
    for (let i = 0; i < 15; i++) {
      languageRepo.add(
        createSpokenLanguage({
          code: `lang${i}`,
          nameEn: `Language ${i}`,
          order: i,
        }),
      );
    }

    const result = await useCase.execute('language', 5);

    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('should order search results by order field', async () => {
    languageRepo.clear();
    languageRepo.add(createSpokenLanguage({ code: 'pt', nameEn: 'Portuguese Language', order: 3 }));
    languageRepo.add(createSpokenLanguage({ code: 'en', nameEn: 'English Language', order: 1 }));
    languageRepo.add(createSpokenLanguage({ code: 'es', nameEn: 'Spanish Language', order: 2 }));

    const result = await useCase.execute('Language');

    expect(result).toHaveLength(3);
    expect(result[0].code).toBe('en');
    expect(result[1].code).toBe('es');
    expect(result[2].code).toBe('pt');
  });

  it('should only search active languages', async () => {
    languageRepo.clear();
    languageRepo.add(
      createSpokenLanguage({ code: 'en', nameEn: 'TestLang English', isActive: true }),
    );
    languageRepo.add(
      createSpokenLanguage({ code: 'de', nameEn: 'TestLang German', isActive: false }),
    );

    const result = await useCase.execute('TestLang');

    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('en');
  });

  it('should return empty array when no matches found', async () => {
    const result = await useCase.execute('xyz');

    expect(result).toEqual([]);
  });
});
