/**
 * Theme CRUD Service Unit Tests
 *
 * Clean Architecture tests using in-memory repositories.
 * Tests verify actual service behavior with type-safe implementations.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import { createTestTheme, InMemoryThemeRepository, StubAuthorizationService } from '../../testing';
import { AuthorizationPort } from '../domain/ports/authorization.port';
import type { JsonValue, ThemeEntity } from '../domain/ports/theme.repository.port';
import { ThemeStatus } from '../domain/ports/theme.repository.port';
import { ThemeCrudService } from './theme-crud.service';

describe('ThemeCrudService', () => {
  let service: ThemeCrudService;
  let themeRepo: InMemoryThemeRepository;
  let authService: StubAuthorizationService;

  const testTheme: ThemeEntity = createTestTheme({
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
        if (args?.where?.authorId) return themeRepo.countByAuthor(args.where.authorId);
        return themeRepo.getAll().length;
      }),
      create: mock(async (args: { data: Record<string, unknown> }) => {
        return themeRepo.create({
          name: args.data.name as string,
          description: args.data.description as string,
          category: args.data.category as ThemeEntity['category'],
          tags: (args.data.tags as string[]) ?? [],
          styleConfig: (args.data.styleConfig ?? null) as JsonValue,
          authorId: args.data.authorId as string,
          status: (args.data.status as ThemeEntity['status']) ?? ThemeStatus.PRIVATE,
        });
      }),
      update: mock(async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        return themeRepo.update(args.where.id, args.data);
      }),
      findUnique: mock(async (args: { where: { id: string } }) => {
        return themeRepo.findById(args.where.id);
      }),
      findMany: mock(async () => {
        return themeRepo.getAll();
      }),
      delete: mock(async (args: { where: { id: string } }) => {
        return themeRepo.delete(args.where.id);
      }),
    },
    user: {
      findUnique: mock(async () => ({ id: 'user-123' })),
    },
  });

  const setupService = async () => {
    themeRepo = new InMemoryThemeRepository();
    authService = new StubAuthorizationService();

    const prismaService = buildPrismaService();

    const { AtsScorngPort } = await import('../domain/ports/ats-scoring.port');
    const { ThemePreviewPort } = await import('../domain/ports/theme-preview.port');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThemeCrudService,
        { provide: PrismaService, useValue: prismaService },
        { provide: AuthorizationPort, useValue: authService },
        {
          provide: AtsScorngPort,
          useValue: { score: () => ({}), calculateOverallScore: () => 80 },
        },
        { provide: ThemePreviewPort, useValue: { generateAndUploadPreview: async () => null } },
      ],
    }).compile();

    service = module.get<ThemeCrudService>(ThemeCrudService);

    return { prismaService };
  };

  beforeEach(async () => {
    await setupService();
    authService.grantPermission('user-123', 'theme:manage');
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
      expect(result.status).toBe('PUBLISHED');
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
        service.updateThemeForUser('different-user', 'theme-1', { name: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow user with theme:manage permission to update system theme', async () => {
      themeRepo.seed([{ ...testTheme, isSystemTheme: true }]);
      authService.grantPermission('admin', 'theme:manage');

      const result = await service.updateThemeForUser('admin', 'theme-1', { name: 'Updated' });

      expect(result).toBeDefined();
      expect(result.name).toBe('Updated');
    });

    it('should reject user without theme:manage permission updating system theme', async () => {
      themeRepo.seed([{ ...testTheme, isSystemTheme: true }]);

      await expect(
        service.updateThemeForUser('user', 'theme-1', { name: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw EntityNotFoundException for non-existent theme', async () => {
      await expect(
        service.updateThemeForUser('user-123', 'nonexistent', { name: 'Test' }),
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete theme owned by user', async () => {
      themeRepo.seed([testTheme]);

      await service.deleteThemeForUser('user-123', 'theme-1');

      expect(themeRepo.getAll().length).toBe(0);
    });

    it('should reject deleting theme owned by different user', async () => {
      themeRepo.seed([testTheme]);

      await expect(service.deleteThemeForUser('different-user', 'theme-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject deleting system theme', async () => {
      themeRepo.seed([{ ...testTheme, isSystemTheme: true }]);

      await expect(service.deleteThemeForUser('user-123', 'theme-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw EntityNotFoundException for non-existent theme', async () => {
      await expect(service.deleteThemeForUser('user-123', 'nonexistent')).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('findOrFail', () => {
    it('should return theme when found', async () => {
      themeRepo.seed([testTheme]);

      const result = await service.findThemeByIdOrThrow('theme-1');

      expect(result).toEqual(expect.objectContaining({ id: 'theme-1', name: 'My Theme' }));
    });

    it('should throw EntityNotFoundException when not found', async () => {
      await expect(service.findThemeByIdOrThrow('nonexistent')).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });
});
