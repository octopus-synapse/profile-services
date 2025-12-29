/**
 * Theme CRUD Service Tests
 * Tests for create, update, delete operations
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ThemeCrudService } from './theme-crud.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { ThemeStatus, UserRole, ThemeCategory } from '@prisma/client';

// Mock the validators
jest.mock('../validators', () => ({
  validateLayoutConfig: jest.fn(),
  validateSectionsConfig: jest.fn(),
}));

describe('ThemeCrudService', () => {
  let service: ThemeCrudService;
  let prisma: {
    resumeTheme: {
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.USER,
  };

  const mockAdminUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: UserRole.ADMIN,
  };

  const mockTheme = {
    id: 'theme-1',
    name: 'Test Theme',
    description: 'A test theme',
    category: ThemeCategory.PROFESSIONAL,
    tags: ['clean', 'modern'],
    styleConfig: { layout: { type: 'single-column' } },
    authorId: 'user-1',
    isSystemTheme: false,
    status: ThemeStatus.PRIVATE,
    parentThemeId: null,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSystemTheme = {
    ...mockTheme,
    id: 'system-theme-1',
    name: 'System Theme',
    isSystemTheme: true,
    authorId: 'system',
  };

  beforeEach(async () => {
    const mockPrisma = {
      resumeTheme: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThemeCrudService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ThemeCrudService>(ThemeCrudService);
    prisma = mockPrisma;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      name: 'New Theme',
      description: 'A new theme',
      category: ThemeCategory.PROFESSIONAL,
      tags: ['modern'],
      styleConfig: { layout: { type: 'single-column' } },
    };

    it('should create private theme for user', async () => {
      prisma.resumeTheme.create.mockResolvedValue({
        ...mockTheme,
        ...createDto,
        status: ThemeStatus.PRIVATE,
      });

      const result = await service.create('user-1', createDto);

      expect(prisma.resumeTheme.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Theme',
          authorId: 'user-1',
          status: ThemeStatus.PRIVATE,
        }),
      });
      expect(result.status).toBe(ThemeStatus.PRIVATE);
    });

    it('should create theme with parent reference', async () => {
      const dtoWithParent = {
        ...createDto,
        parentThemeId: 'parent-theme-id',
      };

      prisma.resumeTheme.create.mockResolvedValue({
        ...mockTheme,
        ...dtoWithParent,
      });

      await service.create('user-1', dtoWithParent);

      expect(prisma.resumeTheme.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentThemeId: 'parent-theme-id',
        }),
      });
    });

    it('should create theme with empty tags if not provided', async () => {
      const dtoNoTags = {
        name: 'Theme No Tags',
        description: 'A theme without tags',
        category: ThemeCategory.PROFESSIONAL,
        styleConfig: { layout: { type: 'single-column' } },
      };

      prisma.resumeTheme.create.mockResolvedValue({
        ...mockTheme,
        ...dtoNoTags,
        tags: [],
      });

      await service.create('user-1', dtoNoTags);

      expect(prisma.resumeTheme.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tags: [],
        }),
      });
    });

    it('should validate styleConfig on create', async () => {
      const { validateLayoutConfig } = require('../validators');

      prisma.resumeTheme.create.mockResolvedValue(mockTheme);

      await service.create('user-1', createDto);

      expect(validateLayoutConfig).toHaveBeenCalledWith(
        createDto.styleConfig.layout,
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Theme',
      description: 'Updated description',
    };

    it('should update user owned theme', async () => {
      prisma.resumeTheme.findUnique.mockResolvedValue(mockTheme);
      prisma.resumeTheme.update.mockResolvedValue({
        ...mockTheme,
        ...updateDto,
      });

      const result = await service.update('user-1', 'theme-1', updateDto);

      expect(prisma.resumeTheme.update).toHaveBeenCalledWith({
        where: { id: 'theme-1' },
        data: expect.objectContaining({
          name: 'Updated Theme',
        }),
      });
      expect(result.name).toBe('Updated Theme');
    });

    it('should throw NotFoundException for non-existent theme', async () => {
      prisma.resumeTheme.findUnique.mockResolvedValue(null);

      await expect(
        service.update('user-1', 'non-existent', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject update on theme user does not own', async () => {
      prisma.resumeTheme.findUnique.mockResolvedValue({
        ...mockTheme,
        authorId: 'other-user',
      });

      await expect(
        service.update('user-1', 'theme-1', updateDto),
      ).rejects.toThrow('Can only edit own themes');
    });

    it('should reject update on system theme by non-admin', async () => {
      prisma.resumeTheme.findUnique.mockResolvedValue(mockSystemTheme);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.update('user-1', 'system-theme-1', updateDto),
      ).rejects.toThrow('Only admins can edit system themes');
    });

    it('should allow admin to update system theme', async () => {
      prisma.resumeTheme.findUnique.mockResolvedValue(mockSystemTheme);
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.resumeTheme.update.mockResolvedValue({
        ...mockSystemTheme,
        ...updateDto,
      });

      const result = await service.update(
        'admin-1',
        'system-theme-1',
        updateDto,
      );

      expect(result.name).toBe('Updated Theme');
    });

    it('should update theme with new styleConfig', async () => {
      const updateWithConfig = {
        ...updateDto,
        styleConfig: { layout: { type: 'two-column' } },
      };

      prisma.resumeTheme.findUnique.mockResolvedValue(mockTheme);
      prisma.resumeTheme.update.mockResolvedValue({
        ...mockTheme,
        ...updateWithConfig,
      });

      await service.update('user-1', 'theme-1', updateWithConfig);

      expect(prisma.resumeTheme.update).toHaveBeenCalledWith({
        where: { id: 'theme-1' },
        data: expect.objectContaining({
          styleConfig: { layout: { type: 'two-column' } },
        }),
      });
    });
  });

  describe('delete', () => {
    it('should delete user owned theme', async () => {
      prisma.resumeTheme.findUnique.mockResolvedValue(mockTheme);
      prisma.resumeTheme.delete.mockResolvedValue(mockTheme);

      await service.delete('user-1', 'theme-1');

      expect(prisma.resumeTheme.delete).toHaveBeenCalledWith({
        where: { id: 'theme-1' },
      });
    });

    it('should reject delete on system theme', async () => {
      prisma.resumeTheme.findUnique.mockResolvedValue(mockSystemTheme);

      await expect(service.delete('user-1', 'system-theme-1')).rejects.toThrow(
        'Cannot delete system themes',
      );
    });

    it('should reject delete on theme user does not own', async () => {
      prisma.resumeTheme.findUnique.mockResolvedValue({
        ...mockTheme,
        authorId: 'other-user',
      });

      await expect(service.delete('user-1', 'theme-1')).rejects.toThrow(
        'Can only delete own themes',
      );
    });

    it('should throw NotFoundException for non-existent theme', async () => {
      prisma.resumeTheme.findUnique.mockResolvedValue(null);

      await expect(service.delete('user-1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOrFail', () => {
    it('should return theme when found', async () => {
      prisma.resumeTheme.findUnique.mockResolvedValue(mockTheme);

      const result = await service.findOrFail('theme-1');

      expect(result).toEqual(mockTheme);
    });

    it('should throw NotFoundException when theme not found', async () => {
      prisma.resumeTheme.findUnique.mockResolvedValue(null);

      await expect(service.findOrFail('non-existent')).rejects.toThrow(
        'Theme not found',
      );
    });
  });
});
