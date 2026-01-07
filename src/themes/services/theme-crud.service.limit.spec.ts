/**
 * Theme Limit Bug Detection Tests
 *
 * Uncle Bob (sem café): "O usuário pode criar INFINITOS temas!
 * A regra de 5 temas por usuário? IGNORADA!"
 *
 * BUG-006: No Theme Limit Enforcement (5 themes max)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { ThemeCrudService } from './theme-crud.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ThemeStatus, UserRole } from '@prisma/client';

const _MAX_THEMES_PER_USER = 5;

describe('ThemeCrudService - LIMIT BUG DETECTION', () => {
  let service: ThemeCrudService;
  let mockPrisma: {
    resumeTheme: {
      create: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
    user: { findUnique: jest.Mock };
  };

  const mockThemeDto = {
    name: 'New Theme',
    description: 'A new theme',
    category: 'PROFESSIONAL',
    styleConfig: { colors: { primary: '#000000' } },
  };

  beforeEach(async () => {
    mockPrisma = {
      resumeTheme: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      user: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThemeCrudService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ThemeCrudService>(ThemeCrudService);
  });

  describe('BUG-006: Theme Limit Enforcement', () => {
    /**
     * CRITICAL BUG: User can create unlimited themes!
     *
     * Business Rule: "Máximo de 5 temas por usuário."
     *
     * Expected: Should throw UnprocessableEntityException when creating 6th theme
     * Actual: Creates theme without checking count
     */
    it('should REJECT creating 6th theme when user already has 5', async () => {
      // User already has 5 themes
      mockPrisma.resumeTheme.count.mockResolvedValue(5);

      // BUG: This should throw but doesn't!
      await expect(
        service.create('user-123', mockThemeDto as any),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should ALLOW creating theme when user has less than 5', async () => {
      mockPrisma.resumeTheme.count.mockResolvedValue(3);
      mockPrisma.resumeTheme.create.mockResolvedValue({
        id: 'theme-1',
        ...mockThemeDto,
        authorId: 'user-123',
        status: ThemeStatus.PRIVATE,
      });

      const result = await service.create('user-123', mockThemeDto as any);
      expect(result).toBeDefined();
    });

    it('should check theme count before creating', async () => {
      mockPrisma.resumeTheme.count.mockResolvedValue(0);
      mockPrisma.resumeTheme.create.mockResolvedValue({
        id: 'theme-1',
        ...mockThemeDto,
      });

      await service.create('user-123', mockThemeDto as any);

      // BUG: count is never called!
      expect(mockPrisma.resumeTheme.count).toHaveBeenCalledWith({
        where: { authorId: 'user-123' },
      });
    });
  });

  describe('BUG-013: Admin Pre-Approval', () => {
    /**
     * BUG: Admins can't create pre-approved themes!
     *
     * Business Rule: "Admins podem criar temas diretamente aprovados."
     *
     * Expected: Admin themes can be created with APPROVED status
     * Actual: All themes are created as PRIVATE
     */
    it('should allow admin to create pre-approved theme', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-123',
        role: UserRole.ADMIN,
      });
      mockPrisma.resumeTheme.count.mockResolvedValue(0);
      mockPrisma.resumeTheme.create.mockResolvedValue({
        id: 'theme-1',
        ...mockThemeDto,
        status: ThemeStatus.PUBLISHED,
        authorId: 'admin-123',
      });

      // This should create theme as PUBLISHED/APPROVED for admin
      // BUG: There's no method for this!
      await service.create('admin-123', {
        ...mockThemeDto,
        preApproved: true,
      } as any);

      // Should be created as PUBLISHED, not PRIVATE
      expect(mockPrisma.resumeTheme.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: expect.stringMatching(/PUBLISHED|APPROVED/),
          }),
        }),
      );
    });
  });
});
