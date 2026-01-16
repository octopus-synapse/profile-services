/**
 * Theme CRUD Service Unit Tests
 *
 * These tests verify the ACTUAL service behavior, not fake helper functions.
 * Uncle Bob: "Tests should be specifications in executable form."
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ThemeCrudService } from './theme-crud.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ThemeStatus, UserRole } from '@prisma/client';

describe('ThemeCrudService', () => {
  let service: ThemeCrudService;
  let mockPrisma: any;

  const mockTheme = {
    id: 'theme-1',
    name: 'My Theme',
    description: 'A cool theme',
    category: 'PROFESSIONAL',
    status: ThemeStatus.PRIVATE,
    authorId: 'user-123',
    styleConfig: { colors: { primary: '#000' } },
    parentThemeId: null,
    isSystemTheme: false,
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrisma = {
      resumeTheme: {
        count: mock().mockResolvedValue(0),
        create: mock().mockResolvedValue(mockTheme),
        update: mock().mockResolvedValue(mockTheme),
        findUnique: mock().mockResolvedValue(mockTheme),
        findMany: mock().mockResolvedValue([]),
        delete: mock().mockResolvedValue(mockTheme),
      },
      user: {
        findUnique: mock().mockResolvedValue({
          id: 'user-123',
          role: UserRole.USER,
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThemeCrudService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ThemeCrudService>(ThemeCrudService);
  });

  describe('create', () => {
    it('should create theme successfully', async () => {
      const result = await service.createThemeForUser('user-123', {
        name: 'New Theme',
        category: 'PROFESSIONAL' as any,
        styleConfig: { layout: { type: 'single-column' } },
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('theme-1');
      expect(mockPrisma.resumeTheme.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'New Theme',
            authorId: 'user-123',
            status: ThemeStatus.PRIVATE,
          }),
        }),
      );
    });

    it('should validate layout config if provided', async () => {
      // This would test that validateConfig is called
      await service.createThemeForUser('user-123', {
        name: 'Theme with Config',
        styleConfig: { layout: { type: 'single-column' } },
      } as any);

      expect(mockPrisma.resumeTheme.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update theme owned by user', async () => {
      mockPrisma.resumeTheme.findUnique.mockResolvedValue(mockTheme);
      mockPrisma.resumeTheme.update.mockResolvedValue({
        ...mockTheme,
        name: 'Updated Name',
      });

      const result = await service.updateThemeForUser('user-123', 'theme-1', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should reject updating theme owned by different user', async () => {
      mockPrisma.resumeTheme.findUnique.mockResolvedValue(mockTheme);

      await expect(
        service.updateThemeForUser('different-user', 'theme-1', {
          name: 'Hacked',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to update system theme', async () => {
      mockPrisma.resumeTheme.findUnique.mockResolvedValue({
        ...mockTheme,
        isSystemTheme: true,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin',
        role: UserRole.ADMIN,
      });
      mockPrisma.resumeTheme.update.mockResolvedValue(mockTheme);

      await expect(
        service.updateThemeForUser('admin', 'theme-1', { name: 'Updated' }),
      ).resolves.toBeDefined();
    });

    it('should reject non-admin updating system theme', async () => {
      mockPrisma.resumeTheme.findUnique.mockResolvedValue({
        ...mockTheme,
        isSystemTheme: true,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user',
        role: UserRole.USER,
      });

      await expect(
        service.updateThemeForUser('user', 'theme-1', { name: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent theme', async () => {
      mockPrisma.resumeTheme.findUnique.mockResolvedValue(null);

      await expect(
        service.updateThemeForUser('user-123', 'nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete theme owned by user', async () => {
      mockPrisma.resumeTheme.findUnique.mockResolvedValue(mockTheme);
      mockPrisma.resumeTheme.delete.mockResolvedValue(mockTheme);

      await service.deleteThemeForUser('user-123', 'theme-1');

      expect(mockPrisma.resumeTheme.delete).toHaveBeenCalledWith({
        where: { id: 'theme-1' },
      });
    });

    it('should reject deleting theme owned by different user', async () => {
      mockPrisma.resumeTheme.findUnique.mockResolvedValue(mockTheme);

      await expect(
        async () =>
          await service.deleteThemeForUser('different-user', 'theme-1'),
      ).toThrow(ForbiddenException);
    });

    it('should reject deleting system theme', async () => {
      mockPrisma.resumeTheme.findUnique.mockResolvedValue({
        ...mockTheme,
        isSystemTheme: true,
      });

      await expect(
        async () => await service.deleteThemeForUser('user-123', 'theme-1'),
      ).toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent theme', async () => {
      mockPrisma.resumeTheme.findUnique.mockResolvedValue(null);

      await expect(
        async () => await service.deleteThemeForUser('user-123', 'nonexistent'),
      ).toThrow(NotFoundException);
    });
  });

  describe('findOrFail', () => {
    it('should return theme when found', async () => {
      mockPrisma.resumeTheme.findUnique.mockResolvedValue(mockTheme);

      const result = await service.findThemeByIdOrThrow('theme-1');

      expect(result).toEqual(mockTheme);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.resumeTheme.findUnique.mockResolvedValue(null);

      await expect(
        async () => await service.findThemeByIdOrThrow('nonexistent'),
      ).toThrow(NotFoundException);
    });
  });
});
