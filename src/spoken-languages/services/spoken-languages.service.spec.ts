import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { APP_CONFIG } from '@octopus-synapse/profile-contracts';
import { SpokenLanguagesService } from './spoken-languages.service';
import { SpokenLanguagesRepository } from '../repositories/spoken-languages.repository';

describe('SpokenLanguagesService', () => {
  let service: SpokenLanguagesService;
  let repository: SpokenLanguagesRepository;

  beforeEach(async () => {
    const mockFindAllActive = mock();
    const mockSearchByName = mock();
    const mockFindByCode = mock();

    repository = {
      findAllActive: mockFindAllActive,
      searchByName: mockSearchByName,
      findByCode: mockFindByCode,
    } as SpokenLanguagesRepository;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpokenLanguagesService,
        { provide: SpokenLanguagesRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<SpokenLanguagesService>(SpokenLanguagesService);
  });

  describe('getAll', () => {
    it('should return all active languages ordered by order field', async () => {
      const mockLanguages = [
        {
          code: 'en',
          nameEn: 'English',
          namePtBr: 'Inglês',
          nameEs: 'Inglés',
          nativeName: 'English',
        },
        {
          code: 'pt',
          nameEn: 'Portuguese',
          namePtBr: 'Português',
          nameEs: 'Portugués',
          nativeName: 'Português',
        },
        {
          code: 'es',
          nameEn: 'Spanish',
          namePtBr: 'Espanhol',
          nameEs: 'Español',
          nativeName: 'Español',
        },
      ];

      (repository.findAllActive as ReturnType<typeof mock>).mockResolvedValue(
        mockLanguages,
      );

      const result = await service.findAllActiveLanguages();

      expect(result).toEqual(mockLanguages);
      expect(repository.findAllActive).toHaveBeenCalled();
    });

    it('should filter out inactive languages', async () => {
      (repository.findAllActive as ReturnType<typeof mock>).mockResolvedValue(
        [],
      );

      await service.findAllActiveLanguages();

      expect(repository.findAllActive).toHaveBeenCalled();
    });

    it('should return empty array when no languages found', async () => {
      (repository.findAllActive as ReturnType<typeof mock>).mockResolvedValue(
        [],
      );

      const result = await service.findAllActiveLanguages();

      expect(result).toEqual([]);
    });

    it('should handle null nativeName correctly', async () => {
      const mockLanguages = [
        {
          code: 'eo',
          nameEn: 'Esperanto',
          namePtBr: 'Esperanto',
          nameEs: 'Esperanto',
          nativeName: null,
        },
      ];

      (repository.findAllActive as ReturnType<typeof mock>).mockResolvedValue(
        mockLanguages,
      );

      const result = await service.findAllActiveLanguages();

      expect(result[0].nativeName).toBeNull();
    });
  });

  describe('search', () => {
    it('should search languages by English name case-insensitively', async () => {
      const query = 'port';
      const mockLanguages = [
        {
          code: 'pt',
          nameEn: 'Portuguese',
          namePtBr: 'Português',
          nameEs: 'Portugués',
          nativeName: 'Português',
        },
      ];

      (repository.searchByName as ReturnType<typeof mock>).mockResolvedValue(
        mockLanguages,
      );

      const result = await service.searchLanguagesByName(query);

      expect(result).toEqual(mockLanguages);
      expect(repository.searchByName).toHaveBeenCalledWith(
        query,
        APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT,
      );
    });

    it('should search languages by Portuguese name', async () => {
      const query = 'inglês';
      const mockLanguages = [
        {
          code: 'en',
          nameEn: 'English',
          namePtBr: 'Inglês',
          nameEs: 'Inglés',
          nativeName: 'English',
        },
      ];

      (repository.searchByName as ReturnType<typeof mock>).mockResolvedValue(
        mockLanguages,
      );

      await service.searchLanguagesByName(query);

      expect(repository.searchByName).toHaveBeenCalledWith(
        query,
        APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT,
      );
    });

    it('should search languages by Spanish name', async () => {
      const query = 'español';
      (repository.searchByName as ReturnType<typeof mock>).mockResolvedValue(
        [],
      );

      await service.searchLanguagesByName(query);

      expect(repository.searchByName).toHaveBeenCalledWith(
        query,
        APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT,
      );
    });

    it('should search languages by native name', async () => {
      const query = 'français';
      const mockLanguages = [
        {
          code: 'fr',
          nameEn: 'French',
          namePtBr: 'Francês',
          nameEs: 'Francés',
          nativeName: 'Français',
        },
      ];

      (repository.searchByName as ReturnType<typeof mock>).mockResolvedValue(
        mockLanguages,
      );

      await service.searchLanguagesByName(query);

      expect(repository.searchByName).toHaveBeenCalledWith(
        query,
        APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT,
      );
    });

    it('should apply default limit when not specified', async () => {
      const query = 'en';
      (repository.searchByName as ReturnType<typeof mock>).mockResolvedValue(
        [],
      );

      await service.searchLanguagesByName(query);

      expect(repository.searchByName).toHaveBeenCalledWith(
        query,
        APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT,
      );
    });

    it('should respect custom limit parameter', async () => {
      const query = 'en';
      const customLimit = 10;
      (repository.searchByName as ReturnType<typeof mock>).mockResolvedValue(
        [],
      );

      await service.searchLanguagesByName(query, customLimit);

      expect(repository.searchByName).toHaveBeenCalledWith(query, customLimit);
    });

    it('should order search results by order field', async () => {
      const query = 'lan';
      (repository.searchByName as ReturnType<typeof mock>).mockResolvedValue(
        [],
      );

      await service.searchLanguagesByName(query);

      expect(repository.searchByName).toHaveBeenCalledWith(
        query,
        APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT,
      );
    });

    it('should only search active languages', async () => {
      const query = 'test';
      (repository.searchByName as ReturnType<typeof mock>).mockResolvedValue(
        [],
      );

      await service.searchLanguagesByName(query);

      expect(repository.searchByName).toHaveBeenCalledWith(
        query,
        APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT,
      );
    });

    it('should return empty array when no matches found', async () => {
      const query = 'xyz';
      (repository.searchByName as ReturnType<typeof mock>).mockResolvedValue(
        [],
      );

      const result = await service.searchLanguagesByName(query);

      expect(result).toEqual([]);
    });
  });

  describe('getByCode', () => {
    it('should return language by code', async () => {
      const code = 'en';
      const mockLanguage = {
        code: 'en',
        nameEn: 'English',
        namePtBr: 'Inglês',
        nameEs: 'Inglés',
        nativeName: 'English',
      };

      (repository.findByCode as ReturnType<typeof mock>).mockResolvedValue(
        mockLanguage,
      );

      const result = await service.findLanguageByCode(code);

      expect(result).toEqual(mockLanguage);
      expect(repository.findByCode).toHaveBeenCalledWith(code);
    });

    it('should return null when language not found', async () => {
      const code = 'nonexistent';

      (repository.findByCode as ReturnType<typeof mock>).mockResolvedValue(
        null,
      );

      const result = await service.findLanguageByCode(code);

      expect(result).toBeNull();
    });

    it('should handle language with null native name', async () => {
      const code = 'la';
      const mockLanguage = {
        code: 'la',
        nameEn: 'Latin',
        namePtBr: 'Latim',
        nameEs: 'Latín',
        nativeName: null,
      };

      (repository.findByCode as ReturnType<typeof mock>).mockResolvedValue(
        mockLanguage,
      );

      const result = await service.findLanguageByCode(code);

      expect(result?.nativeName).toBeNull();
    });

    it('should query by exact code', async () => {
      const code = 'pt-BR';
      (repository.findByCode as ReturnType<typeof mock>).mockResolvedValue(
        null,
      );

      await service.findLanguageByCode(code);

      expect(repository.findByCode).toHaveBeenCalledWith(code);
    });
  });
});
