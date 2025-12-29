/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Theme Application Service Tests
 * Tests for applying themes to resumes and managing customizations
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ThemeApplicationService } from './theme-application.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ThemeCrudService } from './theme-crud.service';
import { ThemeQueryService } from './theme-query.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ThemeStatus, ThemeCategory } from '@prisma/client';

// Mock deepMerge utility
jest.mock('../utils', () => ({
  deepMerge: jest.fn((base, overrides) => ({ ...base, ...overrides })),
}));

describe('ThemeApplicationService', () => {
  let service: ThemeApplicationService;
  let prisma: {
    resume: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    resumeTheme: {
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let crud: {
    findOrFail: jest.Mock;
  };
  let query: {
    findOne: jest.Mock;
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockResume = {
    id: 'resume-1',
    userId: 'user-1',
    title: 'My Resume',
    activeThemeId: 'theme-1',
    customTheme: null,
  };

  const mockTheme = {
    id: 'theme-1',
    name: 'Test Theme',
    description: 'A test theme',
    category: ThemeCategory.PROFESSIONAL,
    tags: ['clean', 'modern'],
    styleConfig: {
      layout: { type: 'single-column' },
      colors: { primary: '#007bff' },
    },
    authorId: 'user-1',
    isSystemTheme: false,
    status: ThemeStatus.PUBLISHED,
    parentThemeId: null,
    usageCount: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      resume: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      resumeTheme: {
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockCrud = {
      findOrFail: jest.fn(),
    };

    const mockQuery = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThemeApplicationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ThemeCrudService, useValue: mockCrud },
        { provide: ThemeQueryService, useValue: mockQuery },
      ],
    }).compile();

    service = module.get<ThemeApplicationService>(ThemeApplicationService);
    prisma = mockPrisma;
    crud = mockCrud;
    query = mockQuery;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('applyToResume', () => {
    const applyDto = {
      resumeId: 'resume-1',
      themeId: 'theme-1',
    };

    it('should apply theme to resume successfully', async () => {
      prisma.resume.findUnique.mockResolvedValue(mockResume);
      query.findOne.mockResolvedValue(mockTheme);
      prisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.applyToResume('user-1', applyDto);

      expect(result).toEqual({ success: true });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should apply theme with customizations', async () => {
      const dtoWithCustomizations = {
        ...applyDto,
        customizations: { colors: { primary: '#ff0000' } },
      };

      prisma.resume.findUnique.mockResolvedValue(mockResume);
      query.findOne.mockResolvedValue(mockTheme);
      prisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.applyToResume(
        'user-1',
        dtoWithCustomizations,
      );

      expect(result).toEqual({ success: true });
    });

    it('should throw ForbiddenException if resume not found', async () => {
      prisma.resume.findUnique.mockResolvedValue(null);

      await expect(service.applyToResume('user-1', applyDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if resume belongs to another user', async () => {
      prisma.resume.findUnique.mockResolvedValue({
        ...mockResume,
        userId: 'other-user',
      });

      await expect(service.applyToResume('user-1', applyDto)).rejects.toThrow(
        'Resume not found or access denied',
      );
    });

    it('should throw NotFoundException if theme not found', async () => {
      prisma.resume.findUnique.mockResolvedValue(mockResume);
      query.findOne.mockResolvedValue(null);

      await expect(service.applyToResume('user-1', applyDto)).rejects.toThrow(
        'Theme not found or access denied',
      );
    });
  });

  describe('fork', () => {
    const forkDto = {
      themeId: 'theme-1',
      name: 'My Forked Theme',
    };

    it('should fork a published theme', async () => {
      crud.findOrFail.mockResolvedValue(mockTheme);
      prisma.resumeTheme.create.mockResolvedValue({
        ...mockTheme,
        id: 'forked-theme-1',
        name: 'My Forked Theme',
        description: 'Forked from Test Theme',
        parentThemeId: 'theme-1',
        authorId: 'user-1',
        status: ThemeStatus.PRIVATE,
      });

      const result = await service.fork('user-1', forkDto);

      expect(prisma.resumeTheme.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'My Forked Theme',
          description: 'Forked from Test Theme',
          parentThemeId: 'theme-1',
          authorId: 'user-1',
          status: ThemeStatus.PRIVATE,
        }),
      });
      expect(result.name).toBe('My Forked Theme');
    });

    it('should fork own private theme', async () => {
      const privateTheme = {
        ...mockTheme,
        status: ThemeStatus.PRIVATE,
        authorId: 'user-1',
      };
      crud.findOrFail.mockResolvedValue(privateTheme);
      prisma.resumeTheme.create.mockResolvedValue({
        ...privateTheme,
        id: 'forked-theme-2',
        name: 'My Forked Theme',
        parentThemeId: 'theme-1',
      });

      const result = await service.fork('user-1', forkDto);

      expect(result.id).toBe('forked-theme-2');
    });

    it('should reject forking private theme of another user', async () => {
      const otherUserTheme = {
        ...mockTheme,
        status: ThemeStatus.PRIVATE,
        authorId: 'other-user',
      };
      crud.findOrFail.mockResolvedValue(otherUserTheme);

      await expect(service.fork('user-1', forkDto)).rejects.toThrow(
        'Cannot fork this theme',
      );
    });

    it('should reject forking pending approval theme of another user', async () => {
      const pendingTheme = {
        ...mockTheme,
        status: ThemeStatus.PENDING_APPROVAL,
        authorId: 'other-user',
      };
      crud.findOrFail.mockResolvedValue(pendingTheme);

      await expect(service.fork('user-1', forkDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getResolvedConfig', () => {
    it('should return base config when no customizations', async () => {
      const resumeWithTheme = {
        ...mockResume,
        customTheme: null,
        activeTheme: mockTheme,
      };
      prisma.resume.findUnique.mockResolvedValue(resumeWithTheme);

      const result = await service.getResolvedConfig('resume-1', 'user-1');

      expect(result).toEqual(mockTheme.styleConfig);
    });

    it('should merge customizations with base config', async () => {
      const customizations = { colors: { primary: '#ff0000' } };
      const resumeWithCustom = {
        ...mockResume,
        customTheme: customizations,
        activeTheme: mockTheme,
      };
      prisma.resume.findUnique.mockResolvedValue(resumeWithCustom);

      const { deepMerge } = require('../utils');
      deepMerge.mockReturnValue({
        ...mockTheme.styleConfig,
        ...customizations,
      });

      const result = await service.getResolvedConfig('resume-1', 'user-1');

      expect(deepMerge).toHaveBeenCalledWith(
        mockTheme.styleConfig,
        customizations,
      );
      expect(
        (result as Record<string, { primary: string }>).colors.primary,
      ).toBe('#ff0000');
    });

    it('should return null if no active theme', async () => {
      const resumeNoTheme = {
        ...mockResume,
        activeTheme: null,
      };
      prisma.resume.findUnique.mockResolvedValue(resumeNoTheme);

      const result = await service.getResolvedConfig('resume-1', 'user-1');

      expect(result).toBeNull();
    });

    it('should throw ForbiddenException if resume not found', async () => {
      prisma.resume.findUnique.mockResolvedValue(null);

      await expect(
        service.getResolvedConfig('resume-1', 'user-1'),
      ).rejects.toThrow('Resume not found');
    });

    it('should throw ForbiddenException for another user resume', async () => {
      prisma.resume.findUnique.mockResolvedValue({
        ...mockResume,
        userId: 'other-user',
      });

      await expect(
        service.getResolvedConfig('resume-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
