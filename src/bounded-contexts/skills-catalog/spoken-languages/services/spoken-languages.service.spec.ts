import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { SpokenLanguagesService } from './spoken-languages.service';

describe('SpokenLanguagesService', () => {
  let service: SpokenLanguagesService;
  let prismaService: {
    spokenLanguage: {
      findMany: ReturnType<typeof mock>;
      findUnique: ReturnType<typeof mock>;
    };
  };
  let mockFindMany: ReturnType<typeof mock>;
  let mockFindUnique: ReturnType<typeof mock>;

  beforeEach(async () => {
    mockFindMany = mock();
    mockFindUnique = mock();

    prismaService = {
      spokenLanguage: {
        findMany: mockFindMany,
        findUnique: mockFindUnique,
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SpokenLanguagesService, { provide: PrismaService, useValue: prismaService }],
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

      mockFindMany.mockResolvedValue(mockLanguages);

      const result = await service.findAllActiveLanguages();

      expect(result).toEqual(mockLanguages);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { order: 'asc' },
        select: {
          code: true,
          nameEn: true,
          namePtBr: true,
          nameEs: true,
          nativeName: true,
        },
      });
    });

    it('should filter out inactive languages', async () => {
      mockFindMany.mockResolvedValue([]);

      await service.findAllActiveLanguages();

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('should return empty array when no languages found', async () => {
      mockFindMany.mockResolvedValue([]);

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

      mockFindMany.mockResolvedValue(mockLanguages);

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

      mockFindMany.mockResolvedValue(mockLanguages);

      const result = await service.searchLanguagesByName(query);

      expect(result).toEqual(mockLanguages);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ nameEn: { contains: query, mode: 'insensitive' } }]),
          }),
        }),
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

      mockFindMany.mockResolvedValue(mockLanguages);

      await service.searchLanguagesByName(query);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ namePtBr: { contains: query, mode: 'insensitive' } }]),
          }),
        }),
      );
    });

    it('should search languages by Spanish name', async () => {
      const query = 'español';
      mockFindMany.mockResolvedValue([]);

      await service.searchLanguagesByName(query);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ nameEs: { contains: query, mode: 'insensitive' } }]),
          }),
        }),
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

      mockFindMany.mockResolvedValue(mockLanguages);

      await service.searchLanguagesByName(query);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ nativeName: { contains: query, mode: 'insensitive' } }]),
          }),
        }),
      );
    });

    it('should apply default limit when not specified', async () => {
      const query = 'en';
      mockFindMany.mockResolvedValue([]);

      await service.searchLanguagesByName(query);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10, // APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT default
        }),
      );
    });

    it('should respect custom limit parameter', async () => {
      const query = 'en';
      const customLimit = 10;
      mockFindMany.mockResolvedValue([]);

      await service.searchLanguagesByName(query, customLimit);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: customLimit,
        }),
      );
    });

    it('should order search results by order field', async () => {
      const query = 'lan';
      mockFindMany.mockResolvedValue([]);

      await service.searchLanguagesByName(query);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { order: 'asc' },
        }),
      );
    });

    it('should only search active languages', async () => {
      const query = 'test';
      mockFindMany.mockResolvedValue([]);

      await service.searchLanguagesByName(query);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });

    it('should return empty array when no matches found', async () => {
      const query = 'xyz';
      mockFindMany.mockResolvedValue([]);

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

      mockFindUnique.mockResolvedValue(mockLanguage);

      const result = await service.findLanguageByCode(code);

      expect(result).toEqual(mockLanguage);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { code },
        select: {
          code: true,
          nameEn: true,
          namePtBr: true,
          nameEs: true,
          nativeName: true,
        },
      });
    });

    it('should return null when language not found', async () => {
      const code = 'nonexistent';

      mockFindUnique.mockResolvedValue(null);

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

      mockFindUnique.mockResolvedValue(mockLanguage);

      const result = await service.findLanguageByCode(code);

      expect(result?.nativeName).toBeNull();
    });

    it('should query by exact code', async () => {
      const code = 'pt-BR';
      mockFindUnique.mockResolvedValue(null);

      await service.findLanguageByCode(code);

      expect(mockFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { code },
        }),
      );
    });
  });
});
