/**
 * Theme CRUD Service Unit Tests
 *
 * These tests verify the ACTUAL service behavior, not fake helper functions.
 * Uncle Bob: "Tests should be specifications in executable form."
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ResourceNotFoundError,
  ResourceOwnershipError,
} from '@octopus-synapse/profile-contracts';
import { ThemeCrudService } from './theme-crud.service';
import { ThemeRepository } from '../repositories/theme.repository';
import { AuthorizationService } from '../../authorization';
import { ThemeStatus } from '@prisma/client';

describe('ThemeCrudService', () => {
  let service: ThemeCrudService;
  let repository: ThemeRepository;
  let authorizationService: AuthorizationService;

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
    const mockCountByAuthor = mock();
    const mockCreate = mock();
    const mockUpdate = mock();
    const mockFindById = mock();
    const mockDelete = mock();
    const mockHasPermission = mock();

    repository = {
      countByAuthor: mockCountByAuthor,
      create: mockCreate,
      update: mockUpdate,
      findById: mockFindById,
      delete: mockDelete,
    } as ThemeRepository;

    authorizationService = {
      hasPermission: mockHasPermission,
    } as AuthorizationService;

    mockCountByAuthor.mockResolvedValue(0);
    mockCreate.mockResolvedValue(mockTheme);
    mockUpdate.mockResolvedValue(mockTheme);
    mockFindById.mockResolvedValue(mockTheme);
    mockDelete.mockResolvedValue(mockTheme);
    mockHasPermission.mockResolvedValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThemeCrudService,
        { provide: ThemeRepository, useValue: repository },
        { provide: AuthorizationService, useValue: authorizationService },
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
      expect(repository.create).toHaveBeenCalled();
    });

    it('should enforce max 5 themes per user', async () => {
      (repository.countByAuthor as ReturnType<typeof mock>).mockResolvedValue(
        5,
      );

      await expect(
        service.createThemeForUser('user-123', {
          name: 'Sixth Theme',
          category: 'PROFESSIONAL' as any,
          styleConfig: { layout: { type: 'single-column' } },
        }),
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update theme successfully', async () => {
      const result = await service.updateThemeForUser('user-123', 'theme-1', {
        name: 'Updated Theme',
      });

      expect(result).toBeDefined();
      expect(repository.update).toHaveBeenCalled();
    });

    it('should throw ResourceNotFoundError when theme not found', async () => {
      (repository.findById as ReturnType<typeof mock>).mockResolvedValue(null);

      await expect(
        service.updateThemeForUser('user-123', 'theme-1', { name: 'Updated' }),
      ).rejects.toThrow(ResourceNotFoundError);
    });

    it('should throw ResourceOwnershipError when user does not own theme', async () => {
      (repository.findById as ReturnType<typeof mock>).mockResolvedValue({
        ...mockTheme,
        authorId: 'other-user',
      });

      await expect(
        service.updateThemeForUser('user-123', 'theme-1', { name: 'Updated' }),
      ).rejects.toThrow(ResourceOwnershipError);
    });
  });

  describe('delete', () => {
    it('should delete theme successfully', async () => {
      await service.deleteThemeForUser('user-123', 'theme-1');

      expect(repository.delete).toHaveBeenCalledWith('theme-1');
    });

    it('should throw ResourceNotFoundError when theme not found', async () => {
      (repository.findById as ReturnType<typeof mock>).mockResolvedValue(null);

      await expect(
        service.deleteThemeForUser('user-123', 'theme-1'),
      ).rejects.toThrow(ResourceNotFoundError);
    });

    it('should throw ResourceOwnershipError when user does not own theme', async () => {
      (repository.findById as ReturnType<typeof mock>).mockResolvedValue({
        ...mockTheme,
        authorId: 'other-user',
      });

      await expect(
        service.deleteThemeForUser('user-123', 'theme-1'),
      ).rejects.toThrow(ResourceOwnershipError);
    });
  });

  describe('findThemeByIdOrThrow', () => {
    it('should return theme by id', async () => {
      const result = await service.findThemeByIdOrThrow('theme-1');

      expect(result).toBeDefined();
      expect(repository.findById).toHaveBeenCalledWith('theme-1');
    });

    it('should throw ResourceNotFoundError when theme not found', async () => {
      (repository.findById as ReturnType<typeof mock>).mockResolvedValue(null);

      await expect(service.findThemeByIdOrThrow('theme-1')).rejects.toThrow(
        ResourceNotFoundError,
      );
    });
  });
});
