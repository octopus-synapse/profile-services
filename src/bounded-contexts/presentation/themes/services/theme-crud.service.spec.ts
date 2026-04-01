/**
 * Theme CRUD Service Unit Tests
 *
 * Clean Architecture tests using in-memory repositories.
 * Tests verify actual service behavior with type-safe implementations.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThemeStatus } from '@prisma/client';
import { AuthorizationService } from '@/bounded-contexts/identity/authorization';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  createTestTheme,
  InMemoryThemeRepository,
  StubAuthorizationService,
  type ThemeRecord,
} from '../../testing';
import { ThemeCrudService } from './theme-crud.service';

describe('ThemeCrudService', () => {
  let service: ThemeCrudService;
  let themeRepo: InMemoryThemeRepository;
  let authService: StubAuthorizationService;

  const testTheme: ThemeRecord = createTestTheme({
    id: 'theme-1',
    name: 'My Theme',
    description: 'A cool theme',
    category: 'PROFESSIONAL',
    status: ThemeStatus.PRIVATE,
    authorId: 'user-123',
    styleConfig: { colors: { primary: '#000' } },
    isSystemTheme: false,
  });

  const buildPrismaService = () => ({
    resumeTheme: {
      count: mock(async (args?: { where?: { authorId?: string } }) => {
        return themeRepo.count(args?.where);
      }),
      create: mock(async (args: { data: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> }) => {
        return themeRepo.create(args.data);
      }),
      update: mock(
        async (args: {
          where: { id: string };
          data: Partial<ThemeRecord> & { rejectionCount?: { increment: number } | number };
        }) => {
          return themeRepo.update(args.where, args.data);
        },
      ),
      findUnique: mock(async (args: { where: { id: string } }) => {
        return themeRepo.findUnique(args.where);
      }),
      findMany: mock(async () => {
        return themeRepo.getAll();
      }),
      delete: mock(async (args: { where: { id: string } }) => {
        return themeRepo.delete(args.where);
      }),
    },
    user: {
      findUnique: mock(async () => ({ id: 'user-123' })),
    },
  });

  const buildAuthorizationService = () => ({
    hasPermission: mock(async (userId: string, resource: string, action: string) => {
      return authService.hasPermission(userId, `${resource}:${action}`);
    }),
  });

  const setupService = async () => {
    themeRepo = new InMemoryThemeRepository();
    authService = new StubAuthorizationService();

    const prismaService = buildPrismaService();
    const authorizationService = buildAuthorizationService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThemeCrudService,
        { provide: PrismaService, useValue: prismaService },
        { provide: AuthorizationService, useValue: authorizationService },
      ],
    }).compile();

    service = module.get<ThemeCrudService>(ThemeCrudService);

    return { prismaService, authorizationService };
  };

  beforeEach(async () => {
    await setupService();
  });

  describe('create', () => {
    it('should create theme successfully', async () => {
      const result = await service.createThemeForUser('user-123', {
        name: 'New Theme',
        category: 'PROFESSIONAL',
        styleConfig: { layout: { type: 'single-column' } },
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('New Theme');
      expect(result.authorId).toBe('user-123');
      expect(result.status).toBe(ThemeStatus.PRIVATE);
    });

    it('should validate layout config if provided', async () => {
      const result = await service.createThemeForUser('user-123', {
        name: 'Theme with Config',
        category: 'PROFESSIONAL',
        styleConfig: { layout: { type: 'single-column' } },
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Theme with Config');
    });
  });

  describe('update', () => {
    it('should update theme owned by user', async () => {
      themeRepo.seed([testTheme]);

      const result = await service.updateThemeForUser('user-123', 'theme-1', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should reject updating theme owned by different user', async () => {
      themeRepo.seed([testTheme]);

      await expect(
        service.updateThemeForUser('different-user', 'theme-1', {
          name: 'Hacked',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow user with theme:manage permission to update system theme', async () => {
      const systemTheme: ThemeRecord = {
        ...testTheme,
        isSystemTheme: true,
      };
      themeRepo.seed([systemTheme]);
      authService.grantPermission('admin', 'theme:manage');

      const result = await service.updateThemeForUser('admin', 'theme-1', {
        name: 'Updated',
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Updated');
    });

    it('should reject user without theme:manage permission updating system theme', async () => {
      const systemTheme: ThemeRecord = {
        ...testTheme,
        isSystemTheme: true,
      };
      themeRepo.seed([systemTheme]);

      await expect(
        service.updateThemeForUser('user', 'theme-1', { name: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent theme', async () => {
      await expect(
        service.updateThemeForUser('user-123', 'nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete theme owned by user', async () => {
      themeRepo.seed([testTheme]);

      await service.deleteThemeForUser('user-123', 'theme-1');

      const remaining = themeRepo.getAll();
      expect(remaining.length).toBe(0);
    });

    it('should reject deleting theme owned by different user', async () => {
      themeRepo.seed([testTheme]);

      await expect(service.deleteThemeForUser('different-user', 'theme-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject deleting system theme', async () => {
      const systemTheme: ThemeRecord = {
        ...testTheme,
        isSystemTheme: true,
      };
      themeRepo.seed([systemTheme]);

      await expect(service.deleteThemeForUser('user-123', 'theme-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException for non-existent theme', async () => {
      await expect(service.deleteThemeForUser('user-123', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOrFail', () => {
    it('should return theme when found', async () => {
      themeRepo.seed([testTheme]);

      const result = await service.findThemeByIdOrThrow('theme-1');

      expect(result).toEqual(
        expect.objectContaining({
          id: 'theme-1',
          name: 'My Theme',
        }),
      );
    });

    it('should throw NotFoundException when not found', async () => {
      await expect(service.findThemeByIdOrThrow('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
