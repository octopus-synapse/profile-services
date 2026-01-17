/**
 * Theme Approval Service Tests
 * Tests for theme submission and review workflow
 *
 * Authorization is based on permissions, not roles.
 * Users with 'theme:approve' permission can approve/reject themes.
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ThemeApprovalService } from './theme-approval.service';
import { ThemeCrudService } from './theme-crud.service';
import { ThemeRepository } from '../repositories/theme.repository';
import { AuthorizationService } from '../../authorization';
import {
  BusinessRuleError,
  DomainValidationError,
  PermissionDeniedError,
  ResourceOwnershipError,
} from '@octopus-synapse/profile-contracts';
import { ThemeStatus } from '@prisma/client';

describe('ThemeApprovalService', () => {
  let service: ThemeApprovalService;
  let themeRepository: {
    update: ReturnType<typeof mock>;
    findManyByStatus: ReturnType<typeof mock>;
  };
  let crud: ThemeCrudService;
  let authorizationService: { hasPermission: ReturnType<typeof mock> };

  const createMockTheme = (overrides = {}) => ({
    id: 'theme-1',
    name: 'Test Theme',
    description: 'A test theme',
    authorId: 'user-1',
    status: ThemeStatus.PRIVATE,
    isSystemTheme: false,
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    authorizationService = {
      hasPermission: mock().mockResolvedValue(false),
    };

    themeRepository = {
      update: mock(),
      findManyByStatus: mock(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThemeApprovalService,
        {
          provide: ThemeRepository,
          useValue: themeRepository,
        },
        {
          provide: ThemeCrudService,
          useValue: {
            findThemeByIdOrThrow: mock(),
          },
        },
        {
          provide: AuthorizationService,
          useValue: authorizationService,
        },
      ],
    }).compile();

    service = module.get<ThemeApprovalService>(ThemeApprovalService);
    crud = module.get(ThemeCrudService);
  });

  afterEach(() => {});

  describe('submitForApproval', () => {
    it('should submit PRIVATE theme → PENDING_APPROVAL', async () => {
      const privateTheme = createMockTheme({ status: ThemeStatus.PRIVATE });
      (crud.findThemeByIdOrThrow as any).mockResolvedValue(privateTheme);
      (themeRepository.update as any).mockResolvedValue({
        ...privateTheme,
        status: ThemeStatus.PENDING_APPROVAL,
      });

      const result = await service.submitForApproval('user-1', 'theme-1');

      expect(themeRepository.update).toHaveBeenCalledWith('theme-1', {
        status: ThemeStatus.PENDING_APPROVAL,
        rejectionReason: null,
      });
      expect(result.status).toBe(ThemeStatus.PENDING_APPROVAL);
    });

    it('should submit REJECTED theme → PENDING_APPROVAL (resubmit)', async () => {
      const rejectedTheme = createMockTheme({
        status: ThemeStatus.REJECTED,
        rejectionReason: 'Previous rejection reason',
      });
      (crud.findThemeByIdOrThrow as any).mockResolvedValue(rejectedTheme);
      (themeRepository.update as any).mockResolvedValue({
        ...rejectedTheme,
        status: ThemeStatus.PENDING_APPROVAL,
        rejectionReason: null,
      });

      const result = await service.submitForApproval('user-1', 'theme-1');

      expect(result.status).toBe(ThemeStatus.PENDING_APPROVAL);
      expect(result.rejectionReason).toBeNull();
    });

    it('should reject submission if not theme owner', async () => {
      const theme = createMockTheme({ authorId: 'other-user' });
      (crud.findThemeByIdOrThrow as any).mockResolvedValue(theme);

      await expect(
        service.submitForApproval('user-1', 'theme-1'),
      ).rejects.toThrow(ResourceOwnershipError);
    });

    it('should reject submission of already published theme', async () => {
      const publishedTheme = createMockTheme({ status: ThemeStatus.PUBLISHED });
      (crud.findThemeByIdOrThrow as any).mockResolvedValue(publishedTheme);

      await expect(
        service.submitForApproval('user-1', 'theme-1'),
      ).rejects.toThrow(BusinessRuleError);
    });

    it('should reject submission of pending theme', async () => {
      const pendingTheme = createMockTheme({
        status: ThemeStatus.PENDING_APPROVAL,
      });
      (crud.findThemeByIdOrThrow as any).mockResolvedValue(pendingTheme);

      await expect(
        service.submitForApproval('user-1', 'theme-1'),
      ).rejects.toThrow(BusinessRuleError);
    });
  });

  describe('review - approve', () => {
    it('should approve: PENDING_APPROVAL → PUBLISHED', async () => {
      const pendingTheme = createMockTheme({
        status: ThemeStatus.PENDING_APPROVAL,
        authorId: 'user-1', // Different from approver
      });
      authorizationService.hasPermission.mockResolvedValue(true);
      (crud.findThemeByIdOrThrow as any).mockResolvedValue(pendingTheme);
      (themeRepository.update as any).mockResolvedValue({
        ...pendingTheme,
        status: ThemeStatus.PUBLISHED,
        approvedById: 'approver-1',
        approvedAt: expect.any(Date),
        publishedAt: expect.any(Date),
      });

      const result = await service.review('approver-1', {
        themeId: 'theme-1',
        approved: true,
      });

      expect(themeRepository.update).toHaveBeenCalledWith(
        'theme-1',
        expect.objectContaining({
          status: ThemeStatus.PUBLISHED,
          approvedById: 'approver-1',
          rejectionReason: null,
        }),
      );
      expect(result.status).toBe(ThemeStatus.PUBLISHED);
    });

    it('should allow user with theme:approve permission to approve themes', async () => {
      const pendingTheme = createMockTheme({
        status: ThemeStatus.PENDING_APPROVAL,
        authorId: 'user-1',
      });
      authorizationService.hasPermission.mockResolvedValue(true);
      (crud.findThemeByIdOrThrow as any).mockResolvedValue(pendingTheme);
      (themeRepository.update as any).mockResolvedValue({
        ...pendingTheme,
        status: ThemeStatus.PUBLISHED,
      });

      await expect(
        service.review('admin-1', { themeId: 'theme-1', approved: true }),
      ).resolves.toBeDefined();
    });
  });

  describe('review - reject', () => {
    it('should reject: PENDING_APPROVAL → REJECTED', async () => {
      const pendingTheme = createMockTheme({
        status: ThemeStatus.PENDING_APPROVAL,
        authorId: 'user-1',
      });
      authorizationService.hasPermission.mockResolvedValue(true);
      (crud.findThemeByIdOrThrow as any).mockResolvedValue(pendingTheme);
      (themeRepository.update as any).mockResolvedValue({
        ...pendingTheme,
        status: ThemeStatus.REJECTED,
        rejectionReason: 'Design needs improvement',
      });

      const result = await service.review('approver-1', {
        themeId: 'theme-1',
        approved: false,
        rejectionReason: 'Design needs improvement',
      });

      expect(themeRepository.update).toHaveBeenCalledWith(
        'theme-1',
        expect.objectContaining({
          status: ThemeStatus.REJECTED,
          rejectionReason: 'Design needs improvement',
        }),
      );
      expect(result.status).toBe(ThemeStatus.REJECTED);
    });

    it('should require rejection reason when rejecting', async () => {
      const pendingTheme = createMockTheme({
        status: ThemeStatus.PENDING_APPROVAL,
        authorId: 'user-1',
      });
      authorizationService.hasPermission.mockResolvedValue(true);
      (crud.findThemeByIdOrThrow as any).mockResolvedValue(pendingTheme);

      await expect(
        service.review('approver-1', {
          themeId: 'theme-1',
          approved: false,
          // No rejection reason
        }),
      ).rejects.toThrow(DomainValidationError);
    });
  });

  describe('review - access control', () => {
    it('should reject user without theme:approve permission', async () => {
      authorizationService.hasPermission.mockResolvedValue(false);

      await expect(
        service.review('user-1', { themeId: 'theme-1', approved: true }),
      ).rejects.toThrow(PermissionDeniedError);
    });

    it('should reject self-approval', async () => {
      const pendingTheme = createMockTheme({
        status: ThemeStatus.PENDING_APPROVAL,
        authorId: 'approver-1', // Same as approver
      });
      authorizationService.hasPermission.mockResolvedValue(true);
      (crud.findThemeByIdOrThrow as any).mockResolvedValue(pendingTheme);

      await expect(
        service.review('approver-1', { themeId: 'theme-1', approved: true }),
      ).rejects.toThrow(PermissionDeniedError);
    });

    it('should reject approval of non-pending themes', async () => {
      const privateTheme = createMockTheme({
        status: ThemeStatus.PRIVATE,
        authorId: 'user-1',
      });
      authorizationService.hasPermission.mockResolvedValue(true);
      (crud.findThemeByIdOrThrow as any).mockResolvedValue(privateTheme);

      await expect(
        service.review('approver-1', { themeId: 'theme-1', approved: true }),
      ).rejects.toThrow(BusinessRuleError);
    });

    it('should reject approval of already published themes', async () => {
      const publishedTheme = createMockTheme({
        status: ThemeStatus.PUBLISHED,
        authorId: 'user-1',
      });
      authorizationService.hasPermission.mockResolvedValue(true);
      (crud.findThemeByIdOrThrow as any).mockResolvedValue(publishedTheme);

      await expect(
        service.review('approver-1', { themeId: 'theme-1', approved: true }),
      ).rejects.toThrow(BusinessRuleError);
    });
  });

  describe('getPendingApprovals', () => {
    it('should return pending themes for user with permission', async () => {
      const pendingThemes = [
        createMockTheme({
          id: 'theme-1',
          status: ThemeStatus.PENDING_APPROVAL,
        }),
        createMockTheme({
          id: 'theme-2',
          status: ThemeStatus.PENDING_APPROVAL,
        }),
      ];
      authorizationService.hasPermission.mockResolvedValue(true);
      (themeRepository.findManyByStatus as any).mockResolvedValue(
        pendingThemes,
      );

      const result = await service.getPendingApprovals('approver-1');

      expect(themeRepository.findManyByStatus).toHaveBeenCalledWith(
        ThemeStatus.PENDING_APPROVAL,
      );
      expect(result).toHaveLength(2);
    });

    it('should reject user without permission', async () => {
      authorizationService.hasPermission.mockResolvedValue(false);

      await expect(
        async () => await service.getPendingApprovals('user-1'),
      ).toThrow(PermissionDeniedError);
    });

    it('should allow user with theme:approve permission', async () => {
      authorizationService.hasPermission.mockResolvedValue(true);
      (themeRepository.findManyByStatus as any).mockResolvedValue([]);

      await expect(
        service.getPendingApprovals('admin-1'),
      ).resolves.toBeDefined();
    });
  });

  describe('workflow: full approval cycle', () => {
    it('should complete: PRIVATE → submit → PENDING → approve → PUBLISHED', async () => {
      // Step 1: Submit
      const privateTheme = createMockTheme({ status: ThemeStatus.PRIVATE });
      (crud.findThemeByIdOrThrow as any).mockResolvedValueOnce(privateTheme);
      (themeRepository.update as any).mockResolvedValueOnce({
        ...privateTheme,
        status: ThemeStatus.PENDING_APPROVAL,
      });

      await service.submitForApproval('user-1', 'theme-1');

      // Step 2: Approve
      const pendingTheme = createMockTheme({
        status: ThemeStatus.PENDING_APPROVAL,
        authorId: 'user-1',
      });
      authorizationService.hasPermission.mockResolvedValue(true);
      (crud.findThemeByIdOrThrow as any).mockResolvedValueOnce(pendingTheme);
      (themeRepository.update as any).mockResolvedValueOnce({
        ...pendingTheme,
        status: ThemeStatus.PUBLISHED,
      });

      const result = await service.review('approver-1', {
        themeId: 'theme-1',
        approved: true,
      });

      expect(result.status).toBe(ThemeStatus.PUBLISHED);
    });

    it('should complete: PRIVATE → submit → PENDING → reject → REJECTED → resubmit → PENDING', async () => {
      // Step 1: Submit
      const privateTheme = createMockTheme({ status: ThemeStatus.PRIVATE });
      (crud.findThemeByIdOrThrow as any).mockResolvedValueOnce(privateTheme);
      (themeRepository.update as any).mockResolvedValueOnce({
        ...privateTheme,
        status: ThemeStatus.PENDING_APPROVAL,
      });

      await service.submitForApproval('user-1', 'theme-1');

      // Step 2: Reject
      const pendingTheme = createMockTheme({
        status: ThemeStatus.PENDING_APPROVAL,
        authorId: 'user-1',
      });
      authorizationService.hasPermission.mockResolvedValue(true);
      (crud.findThemeByIdOrThrow as any).mockResolvedValueOnce(pendingTheme);
      (themeRepository.update as any).mockResolvedValueOnce({
        ...pendingTheme,
        status: ThemeStatus.REJECTED,
        rejectionReason: 'Needs improvement',
      });

      await service.review('approver-1', {
        themeId: 'theme-1',
        approved: false,
        rejectionReason: 'Needs improvement',
      });

      // Step 3: Resubmit
      const rejectedTheme = createMockTheme({
        status: ThemeStatus.REJECTED,
        rejectionReason: 'Needs improvement',
      });
      (crud.findThemeByIdOrThrow as any).mockResolvedValueOnce(rejectedTheme);
      (themeRepository.update as any).mockResolvedValueOnce({
        ...rejectedTheme,
        status: ThemeStatus.PENDING_APPROVAL,
        rejectionReason: null,
      });

      const result = await service.submitForApproval('user-1', 'theme-1');

      expect(result.status).toBe(ThemeStatus.PENDING_APPROVAL);
      expect(result.rejectionReason).toBeNull();
    });
  });
});
