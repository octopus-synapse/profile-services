import { Test, TestingModule } from '@nestjs/testing';
import { SpokenLanguagesService } from './spoken-languages.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SpokenLanguagesService', () => {
  let service: SpokenLanguagesService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockFindMany = jest.fn();
    const mockFindUnique = jest.fn();

    prismaService = {
      spokenLanguage: {
        findMany: mockFindMany,
        findUnique: mockFindUnique,
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpokenLanguagesService,
        { provide: PrismaService, useValue: prismaService },
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

      const mockFindMany = prismaService.spokenLanguage.findMany as jest.Mock;
      mockFindMany.mockResolvedValue(mockLanguages);

      const result = await service.getAll();

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
      const mockFindMany = prismaService.spokenLanguage.findMany as jest.Mock;
      mockFindMany.mockResolvedValue([]);

      await service.getAll();

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('should return empty array when no languages found', async () => {
      const mockFindMany = prismaService.spokenLanguage.findMany as jest.Mock;
      mockFindMany.mockResolvedValue([]);

      const result = await service.getAll();

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

      const mockFindMany = prismaService.spokenLanguage.findMany as jest.Mock;
      mockFindMany.mockResolvedValue(mockLanguages);

      const result = await service.getAll();

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

      const mockFindMany = prismaService.spokenLanguage.findMany as jest.Mock;
      mockFindMany.mockResolvedValue(mockLanguages);

      const result = await service.search(query);

      expect(result).toEqual(mockLanguages);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { nameEn: { contains: query, mode: 'insensitive' } },
            ]),
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

      const mockFindMany = prismaService.spokenLanguage.findMany as jest.Mock;
      mockFindMany.mockResolvedValue(mockLanguages);

      await service.search(query);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { namePtBr: { contains: query, mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should search languages by Spanish name', async () => {
      const query = 'español';
      const mockFindMany = prismaService.spokenLanguage.findMany as jest.Mock;
      mockFindMany.mockResolvedValue([]);

      await service.search(query);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { nameEs: { contains: query, mode: 'insensitive' } },
            ]),
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

      const mockFindMany = prismaService.spokenLanguage.findMany as jest.Mock;
      mockFindMany.mockResolvedValue(mockLanguages);

      await service.search(query);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { nativeName: { contains: query, mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should apply default limit when not specified', async () => {
      const query = 'en';
      const mockFindMany = prismaService.spokenLanguage.findMany as jest.Mock;
      mockFindMany.mockResolvedValue([]);

      await service.search(query);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10, // APP_CONSTANTS.SEARCH_AUTOCOMPLETE_LIMIT default
        }),
      );
    });

    it('should respect custom limit parameter', async () => {
      const query = 'en';
      const customLimit = 10;
      const mockFindMany = prismaService.spokenLanguage.findMany as jest.Mock;
      mockFindMany.mockResolvedValue([]);

      await service.search(query, customLimit);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: customLimit,
        }),
      );
    });

    it('should order search results by order field', async () => {
      const query = 'lan';
      const mockFindMany = prismaService.spokenLanguage.findMany as jest.Mock;
      mockFindMany.mockResolvedValue([]);

      await service.search(query);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { order: 'asc' },
        }),
      );
    });

    it('should only search active languages', async () => {
      const query = 'test';
      const mockFindMany = prismaService.spokenLanguage.findMany as jest.Mock;
      mockFindMany.mockResolvedValue([]);

      await service.search(query);

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
      const mockFindMany = prismaService.spokenLanguage.findMany as jest.Mock;
      mockFindMany.mockResolvedValue([]);

      const result = await service.search(query);

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

      const mockFindUnique = prismaService.spokenLanguage
        .findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(mockLanguage);

      const result = await service.getByCode(code);

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

      const mockFindUnique = prismaService.spokenLanguage
        .findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(null);

      const result = await service.getByCode(code);

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

      const mockFindUnique = prismaService.spokenLanguage
        .findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(mockLanguage);

      const result = await service.getByCode(code);

      expect(result?.nativeName).toBeNull();
    });

    it('should query by exact code', async () => {
      const code = 'pt-BR';
      const mockFindUnique = prismaService.spokenLanguage
        .findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(null);

      await service.getByCode(code);

      expect(mockFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { code },
        }),
      );
    });
  });
});
