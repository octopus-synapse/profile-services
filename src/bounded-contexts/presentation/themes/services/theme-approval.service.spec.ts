/**
 * Theme Approval Service Tests
 * Tests for theme submission and review workflow
 *
 * Clean Architecture tests using in-memory repositories.
 * Authorization is based on permissions, not roles.
 * Users with 'theme:approve' permission can approve/reject themes.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
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
import { ThemeApprovalService } from './theme-approval.service';
import { ThemeCrudService } from './theme-crud.service';

describe('ThemeApprovalService', () => {
  let service: ThemeApprovalService;
  let themeRepo: InMemoryThemeRepository;
  let authService: StubAuthorizationService;
  let _crudService: ThemeCrudService;

  const buildPrismaService = () => ({
    resumeTheme: {
      update: mock(
        async (args: {
          where: { id: string };
          data: Partial<ThemeRecord> & { rejectionCount?: { increment: number } | number };
        }) => {
          return themeRepo.update(args.where, args.data);
        },
      ),
      findMany: mock(
        async (args?: {
          where?: { status?: ThemeStatus; authorId?: string };
          orderBy?: { createdAt?: 'asc' | 'desc' };
          include?: { author?: { select: { id: boolean; name: boolean; email: boolean } } };
        }) => {
          return themeRepo.findMany(args);
        },
      ),
      findUnique: mock(async (args: { where: { id: string } }) => {
        return themeRepo.findUnique(args.where);
      }),
      count: mock(async (args?: { where?: { authorId?: string } }) => {
        return themeRepo.count(args?.where);
      }),
      create: mock(async (args: { data: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> }) => {
        return themeRepo.create(args.data);
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
        ThemeApprovalService,
        ThemeCrudService,
        { provide: PrismaService, useValue: prismaService },
        { provide: AuthorizationService, useValue: authorizationService },
      ],
    }).compile();

    service = module.get<ThemeApprovalService>(ThemeApprovalService);
    _crudService = module.get<ThemeCrudService>(ThemeCrudService);

    return { prismaService, authorizationService };
  };

  beforeEach(async () => {
    await setupService();
  });

  describe('submitForApproval', () => {
    it('should submit PRIVATE theme → PENDING_APPROVAL', async () => {
      const privateTheme = createTestTheme({
        id: 'theme-1',
        authorId: 'user-1',
        status: ThemeStatus.PRIVATE,
      });
      themeRepo.seed([privateTheme]);

      const result = await service.submitForApproval('user-1', 'theme-1');

      expect(result.status).toBe(ThemeStatus.PENDING_APPROVAL);
      expect(result.rejectionReason).toBeNull();
    });

    it('should submit REJECTED theme → PENDING_APPROVAL (resubmit)', async () => {
      const rejectedTheme = createTestTheme({
        id: 'theme-1',
        authorId: 'user-1',
        status: ThemeStatus.REJECTED,
        rejectionReason: 'Previous rejection reason',
        rejectionCount: 1,
      });
      themeRepo.seed([rejectedTheme]);

      const result = await service.submitForApproval('user-1', 'theme-1');

      expect(result.status).toBe(ThemeStatus.PENDING_APPROVAL);
      expect(result.rejectionReason).toBeNull();
    });

    it('should reject submission if not theme owner', async () => {
      const theme = createTestTheme({
        id: 'theme-1',
        authorId: 'other-user',
        status: ThemeStatus.PRIVATE,
      });
      themeRepo.seed([theme]);

      await expect(service.submitForApproval('user-1', 'theme-1')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.submitForApproval('user-1', 'theme-1')).rejects.toThrow(
        'Can only submit own themes',
      );
    });

    it('should reject submission of already published theme', async () => {
      const publishedTheme = createTestTheme({
        id: 'theme-1',
        authorId: 'user-1',
        status: ThemeStatus.PUBLISHED,
      });
      themeRepo.seed([publishedTheme]);

      await expect(service.submitForApproval('user-1', 'theme-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.submitForApproval('user-1', 'theme-1')).rejects.toThrow(
        'Theme must be private or rejected',
      );
    });

    it('should reject submission of pending theme', async () => {
      const pendingTheme = createTestTheme({
        id: 'theme-1',
        authorId: 'user-1',
        status: ThemeStatus.PENDING_APPROVAL,
      });
      themeRepo.seed([pendingTheme]);

      await expect(service.submitForApproval('user-1', 'theme-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('review - approve', () => {
    it('should approve: PENDING_APPROVAL → PUBLISHED', async () => {
      const pendingTheme = createTestTheme({
        id: 'theme-1',
        status: ThemeStatus.PENDING_APPROVAL,
        authorId: 'user-1',
      });
      themeRepo.seed([pendingTheme]);
      authService.grantPermission('approver-1', 'theme:approve');

      const result = await service.review('approver-1', {
        themeId: 'theme-1',
        approved: true,
      });

      expect(result.status).toBe(ThemeStatus.PUBLISHED);
      expect(result.approvedById).toBe('approver-1');
      expect(result.approvedAt).toBeDefined();
      expect(result.publishedAt).toBeDefined();
    });

    it('should allow user with theme:approve permission to approve themes', async () => {
      const pendingTheme = createTestTheme({
        id: 'theme-1',
        status: ThemeStatus.PENDING_APPROVAL,
        authorId: 'user-1',
      });
      themeRepo.seed([pendingTheme]);
      authService.grantPermission('admin-1', 'theme:approve');

      await expect(
        service.review('admin-1', { themeId: 'theme-1', approved: true }),
      ).resolves.toBeDefined();
    });
  });

  describe('review - reject', () => {
    it('should reject: PENDING_APPROVAL → REJECTED', async () => {
      const pendingTheme = createTestTheme({
        id: 'theme-1',
        status: ThemeStatus.PENDING_APPROVAL,
        authorId: 'user-1',
        rejectionCount: 0,
      });
      themeRepo.seed([pendingTheme]);
      authService.grantPermission('approver-1', 'theme:approve');

      const result = await service.review('approver-1', {
        themeId: 'theme-1',
        approved: false,
        rejectionReason: 'Design needs improvement',
      });

      expect(result.status).toBe(ThemeStatus.REJECTED);
      expect(result.rejectionReason).toBe('Design needs improvement');
      expect(result.rejectionCount).toBe(1);
    });

    it('should require rejection reason when rejecting', async () => {
      const pendingTheme = createTestTheme({
        id: 'theme-1',
        status: ThemeStatus.PENDING_APPROVAL,
        authorId: 'user-1',
      });
      themeRepo.seed([pendingTheme]);
      authService.grantPermission('approver-1', 'theme:approve');

      await expect(
        service.review('approver-1', {
          themeId: 'theme-1',
          approved: false,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.review('approver-1', {
          themeId: 'theme-1',
          approved: false,
        }),
      ).rejects.toThrow('Rejection reason is required');
    });
  });

  describe('review - access control', () => {
    it('should reject user without theme:approve permission', async () => {
      await expect(
        service.review('user-1', { themeId: 'theme-1', approved: true }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.review('user-1', { themeId: 'theme-1', approved: true }),
      ).rejects.toThrow('Only approvers can perform this action');
    });

    it('should reject self-approval', async () => {
      const pendingTheme = createTestTheme({
        id: 'theme-1',
        status: ThemeStatus.PENDING_APPROVAL,
        authorId: 'approver-1',
      });
      themeRepo.seed([pendingTheme]);
      authService.grantPermission('approver-1', 'theme:approve');

      await expect(
        service.review('approver-1', { themeId: 'theme-1', approved: true }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.review('approver-1', { themeId: 'theme-1', approved: true }),
      ).rejects.toThrow('Cannot approve own themes');
    });

    it('should reject approval of non-pending themes', async () => {
      const privateTheme = createTestTheme({
        id: 'theme-1',
        status: ThemeStatus.PRIVATE,
        authorId: 'user-1',
      });
      themeRepo.seed([privateTheme]);
      authService.grantPermission('approver-1', 'theme:approve');

      await expect(
        service.review('approver-1', { themeId: 'theme-1', approved: true }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.review('approver-1', { themeId: 'theme-1', approved: true }),
      ).rejects.toThrow('Theme is not pending approval');
    });

    it('should reject approval of already published themes', async () => {
      const publishedTheme = createTestTheme({
        id: 'theme-1',
        status: ThemeStatus.PUBLISHED,
        authorId: 'user-1',
      });
      themeRepo.seed([publishedTheme]);
      authService.grantPermission('approver-1', 'theme:approve');

      await expect(
        service.review('approver-1', { themeId: 'theme-1', approved: true }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPendingApprovals', () => {
    it('should return pending themes for user with permission', async () => {
      const pendingThemes = [
        createTestTheme({
          id: 'theme-1',
          status: ThemeStatus.PENDING_APPROVAL,
        }),
        createTestTheme({
          id: 'theme-2',
          status: ThemeStatus.PENDING_APPROVAL,
        }),
      ];
      themeRepo.seed(pendingThemes);
      authService.grantPermission('approver-1', 'theme:approve');

      const result = await service.getPendingApprovals('approver-1');

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(ThemeStatus.PENDING_APPROVAL);
      expect(result[1].status).toBe(ThemeStatus.PENDING_APPROVAL);
    });

    it('should reject user without permission', async () => {
      await expect(service.getPendingApprovals('user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should allow user with theme:approve permission', async () => {
      authService.grantPermission('admin-1', 'theme:approve');
      themeRepo.seed([]);

      await expect(service.getPendingApprovals('admin-1')).resolves.toBeDefined();
    });
  });

  describe('workflow: full approval cycle', () => {
    it('should complete: PRIVATE → submit → PENDING → approve → PUBLISHED', async () => {
      // Step 1: Submit
      const privateTheme = createTestTheme({
        id: 'theme-1',
        authorId: 'user-1',
        status: ThemeStatus.PRIVATE,
      });
      themeRepo.seed([privateTheme]);

      await service.submitForApproval('user-1', 'theme-1');

      // Step 2: Approve
      authService.grantPermission('approver-1', 'theme:approve');

      const result = await service.review('approver-1', {
        themeId: 'theme-1',
        approved: true,
      });

      expect(result.status).toBe(ThemeStatus.PUBLISHED);
    });

    it('should complete: PRIVATE → submit → PENDING → reject → REJECTED → resubmit → PENDING', async () => {
      // Step 1: Submit
      const privateTheme = createTestTheme({
        id: 'theme-1',
        authorId: 'user-1',
        status: ThemeStatus.PRIVATE,
        rejectionCount: 0,
      });
      themeRepo.seed([privateTheme]);

      await service.submitForApproval('user-1', 'theme-1');

      // Step 2: Reject
      authService.grantPermission('approver-1', 'theme:approve');

      await service.review('approver-1', {
        themeId: 'theme-1',
        approved: false,
        rejectionReason: 'Needs improvement',
      });

      // Step 3: Resubmit
      const result = await service.submitForApproval('user-1', 'theme-1');

      expect(result.status).toBe(ThemeStatus.PENDING_APPROVAL);
      expect(result.rejectionReason).toBeNull();
    });
  });
});
