import { beforeEach, describe, expect, it } from 'bun:test';
import {
  createSpokenLanguage,
  DEFAULT_SPOKEN_LANGUAGES,
  InMemorySpokenLanguageRepository,
} from '../../testing';
import { SpokenLanguagesService } from './spoken-languages.service';

describe('SpokenLanguagesService', () => {
  let service: SpokenLanguagesService;
  let languageRepo: InMemorySpokenLanguageRepository;

  beforeEach(() => {
    languageRepo = new InMemorySpokenLanguageRepository();
    languageRepo.seed(DEFAULT_SPOKEN_LANGUAGES);
    service = new SpokenLanguagesService(languageRepo as never);
  });

  describe('getAll', () => {
    it('should return all active languages ordered by order field', async () => {
      const result = await service.findAllActiveLanguages();

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

      const result = await service.findAllActiveLanguages();

      expect(result).toHaveLength(2);
      expect(result.some((l) => l.code === 'en')).toBe(true);
      expect(result.some((l) => l.code === 'fr')).toBe(true);
      expect(result.some((l) => l.code === 'de')).toBe(false);
    });

    it('should return empty array when no languages found', async () => {
      languageRepo.clear();

      const result = await service.findAllActiveLanguages();

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

      const result = await service.findAllActiveLanguages();

      expect(result[0].nativeName).toBeNull();
    });
  });

  describe('search', () => {
    it('should search languages by English name case-insensitively', async () => {
      const result = await service.searchLanguagesByName('port');

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('pt');
      expect(result[0].nameEn).toBe('Portuguese');
    });

    it('should search languages by Portuguese name', async () => {
      const result = await service.searchLanguagesByName('inglês');

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('en');
      expect(result[0].nameEn).toBe('English');
      expect(result[0].namePtBr).toBe('Inglês');
    });

    it('should search languages by Spanish name', async () => {
      const result = await service.searchLanguagesByName('español');

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('es');
      expect(result[0].nameEs).toBe('Español');
    });

    it('should search languages by native name', async () => {
      const result = await service.searchLanguagesByName('français');

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

      const result = await service.searchLanguagesByName('language');

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

      const result = await service.searchLanguagesByName('language', 5);

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should order search results by order field', async () => {
      languageRepo.clear();
      languageRepo.add(
        createSpokenLanguage({ code: 'pt', nameEn: 'Portuguese Language', order: 3 }),
      );
      languageRepo.add(createSpokenLanguage({ code: 'en', nameEn: 'English Language', order: 1 }));
      languageRepo.add(createSpokenLanguage({ code: 'es', nameEn: 'Spanish Language', order: 2 }));

      const result = await service.searchLanguagesByName('Language');

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

      const result = await service.searchLanguagesByName('TestLang');

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('en');
    });

    it('should return empty array when no matches found', async () => {
      const result = await service.searchLanguagesByName('xyz');

      expect(result).toEqual([]);
    });
  });

  describe('getByCode', () => {
    it('should return language by code', async () => {
      const result = await service.findLanguageByCode('en');

      expect(result).not.toBeNull();
      expect(result?.code).toBe('en');
      expect(result?.nameEn).toBe('English');
      expect(result?.namePtBr).toBe('Inglês');
      expect(result?.nameEs).toBe('Inglés');
      expect(result?.nativeName).toBe('English');
    });

    it('should return null when language not found', async () => {
      const result = await service.findLanguageByCode('nonexistent');

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

      const result = await service.findLanguageByCode('la');

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

      const result = await service.findLanguageByCode('pt-BR');

      expect(result).not.toBeNull();
      expect(result?.code).toBe('pt-BR');
    });
  });
});
