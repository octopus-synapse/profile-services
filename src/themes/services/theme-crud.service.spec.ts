/**
 * Theme CRUD Service Unit Tests
 *
 * These tests verify the ACTUAL service behavior, not fake helper functions.
 * Uncle Bob: "Tests should be specifications in executable form."
 */

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
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue(mockTheme),
        update: jest.fn().mockResolvedValue(mockTheme),
        findUnique: jest.fn().mockResolvedValue(mockTheme),
        findMany: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue(mockTheme),
      },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'user-123', role: UserRole.USER }),
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
      const result = await service.create('user-123', {
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
      await service.create('user-123', {
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

      const result = await service.update('user-123', 'theme-1', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should reject updating theme owned by different user', async () => {
      mockPrisma.resumeTheme.findUnique.mockResolvedValue(mockTheme);

      await expect(
        service.update('different-user', 'theme-1', { name: 'Hacked' }),
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
        service.update('admin', 'theme-1', { name: 'Updated' }),
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
        service.update('user', 'theme-1', { name: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent theme', async () => {
      mockPrisma.resumeTheme.findUnique.mockResolvedValue(null);

      await expect(
        service.update('user-123', 'nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete theme owned by user', async () => {
      mockPrisma.resumeTheme.findUnique.mockResolvedValue(mockTheme);
      mockPrisma.resumeTheme.delete.mockResolvedValue(mockTheme);

      await service.delete('user-123', 'theme-1');

      expect(mockPrisma.resumeTheme.delete).toHaveBeenCalledWith({
        where: { id: 'theme-1' },
      });
    });

    it('should reject deleting theme owned by different user', async () => {
      mockPrisma.resumeTheme.findUnique.mockResolvedValue(mockTheme);

      await expect(service.delete('different-user', 'theme-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject deleting system theme', async () => {
      mockPrisma.resumeTheme.findUnique.mockResolvedValue({
        ...mockTheme,
        isSystemTheme: true,
      });

      await expect(service.delete('user-123', 'theme-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException for non-existent theme', async () => {
      mockPrisma.resumeTheme.findUnique.mockResolvedValue(null);

      await expect(service.delete('user-123', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOrFail', () => {
    it('should return theme when found', async () => {
      mockPrisma.resumeTheme.findUnique.mockResolvedValue(mockTheme);

      const result = await service.findOrFail('theme-1');

      expect(result).toEqual(mockTheme);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.resumeTheme.findUnique.mockResolvedValue(null);

      await expect(service.findOrFail('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
