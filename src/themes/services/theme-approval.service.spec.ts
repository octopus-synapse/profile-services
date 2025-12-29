/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
/**
 * Theme Approval Service Tests
 * Tests for theme submission and review workflow
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ThemeApprovalService } from './theme-approval.service';
import { ThemeCrudService } from './theme-crud.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { ThemeStatus, UserRole } from '@prisma/client';

describe('ThemeApprovalService', () => {
  let service: ThemeApprovalService;
  let prisma: jest.Mocked<PrismaService>;
  let crud: jest.Mocked<ThemeCrudService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.USER,
  };

  const mockApprover = {
    id: 'approver-1',
    email: 'approver@example.com',
    name: 'Approver User',
    role: UserRole.APPROVER,
  };

  const mockAdmin = {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: UserRole.ADMIN,
  };

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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThemeApprovalService,
        {
          provide: PrismaService,
          useValue: {
            resumeTheme: {
              update: jest.fn(),
              findMany: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: ThemeCrudService,
          useValue: {
            findOrFail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ThemeApprovalService>(ThemeApprovalService);
    prisma = module.get(PrismaService);
    crud = module.get(ThemeCrudService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitForApproval', () => {
    it('should submit PRIVATE theme → PENDING_APPROVAL', async () => {
      const privateTheme = createMockTheme({ status: ThemeStatus.PRIVATE });
      (crud.findOrFail as jest.Mock).mockResolvedValue(privateTheme);
      (prisma.resumeTheme.update as jest.Mock).mockResolvedValue({
        ...privateTheme,
        status: ThemeStatus.PENDING_APPROVAL,
      });

      const result = await service.submitForApproval('user-1', 'theme-1');

      expect(prisma.resumeTheme.update).toHaveBeenCalledWith({
        where: { id: 'theme-1' },
        data: {
          status: ThemeStatus.PENDING_APPROVAL,
          rejectionReason: null,
        },
      });
      expect(result.status).toBe(ThemeStatus.PENDING_APPROVAL);
    });

    it('should submit REJECTED theme → PENDING_APPROVAL (resubmit)', async () => {
      const rejectedTheme = createMockTheme({
        status: ThemeStatus.REJECTED,
        rejectionReason: 'Previous rejection reason',
      });
      (crud.findOrFail as jest.Mock).mockResolvedValue(rejectedTheme);
      (prisma.resumeTheme.update as jest.Mock).mockResolvedValue({
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
      (crud.findOrFail as jest.Mock).mockResolvedValue(theme);

      await expect(
        service.submitForApproval('user-1', 'theme-1'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.submitForApproval('user-1', 'theme-1'),
      ).rejects.toThrow('Can only submit own themes');
    });

    it('should reject submission of already published theme', async () => {
      const publishedTheme = createMockTheme({ status: ThemeStatus.PUBLISHED });
      (crud.findOrFail as jest.Mock).mockResolvedValue(publishedTheme);

      await expect(
        service.submitForApproval('user-1', 'theme-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.submitForApproval('user-1', 'theme-1'),
      ).rejects.toThrow('Theme must be private or rejected');
    });

    it('should reject submission of pending theme', async () => {
      const pendingTheme = createMockTheme({
        status: ThemeStatus.PENDING_APPROVAL,
      });
      (crud.findOrFail as jest.Mock).mockResolvedValue(pendingTheme);

      await expect(
        service.submitForApproval('user-1', 'theme-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('review - approve', () => {
    it('should approve: PENDING_APPROVAL → PUBLISHED', async () => {
      const pendingTheme = createMockTheme({
        status: ThemeStatus.PENDING_APPROVAL,
        authorId: 'user-1', // Different from approver
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockApprover);
      (crud.findOrFail as jest.Mock).mockResolvedValue(pendingTheme);
      (prisma.resumeTheme.update as jest.Mock).mockResolvedValue({
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

      expect(prisma.resumeTheme.update).toHaveBeenCalledWith({
        where: { id: 'theme-1' },
        data: expect.objectContaining({
          status: ThemeStatus.PUBLISHED,
          approvedById: 'approver-1',
          rejectionReason: null,
        }),
      });
      expect(result.status).toBe(ThemeStatus.PUBLISHED);
    });

    it('should allow admin to approve themes', async () => {
      const pendingTheme = createMockTheme({
        status: ThemeStatus.PENDING_APPROVAL,
        authorId: 'user-1',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (crud.findOrFail as jest.Mock).mockResolvedValue(pendingTheme);
      (prisma.resumeTheme.update as jest.Mock).mockResolvedValue({
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
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockApprover);
      (crud.findOrFail as jest.Mock).mockResolvedValue(pendingTheme);
      (prisma.resumeTheme.update as jest.Mock).mockResolvedValue({
        ...pendingTheme,
        status: ThemeStatus.REJECTED,
        rejectionReason: 'Design needs improvement',
      });

      const result = await service.review('approver-1', {
        themeId: 'theme-1',
        approved: false,
        rejectionReason: 'Design needs improvement',
      });

      expect(prisma.resumeTheme.update).toHaveBeenCalledWith({
        where: { id: 'theme-1' },
        data: expect.objectContaining({
          status: ThemeStatus.REJECTED,
          rejectionReason: 'Design needs improvement',
        }),
      });
      expect(result.status).toBe(ThemeStatus.REJECTED);
    });

    it('should require rejection reason when rejecting', async () => {
      const pendingTheme = createMockTheme({
        status: ThemeStatus.PENDING_APPROVAL,
        authorId: 'user-1',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockApprover);
      (crud.findOrFail as jest.Mock).mockResolvedValue(pendingTheme);

      await expect(
        service.review('approver-1', {
          themeId: 'theme-1',
          approved: false,
          // No rejection reason
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
    it('should reject non-admin/non-approver approval attempts', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.review('user-1', { themeId: 'theme-1', approved: true }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.review('user-1', { themeId: 'theme-1', approved: true }),
      ).rejects.toThrow('Only approvers can perform this action');
    });

    it('should reject self-approval', async () => {
      const pendingTheme = createMockTheme({
        status: ThemeStatus.PENDING_APPROVAL,
        authorId: 'approver-1', // Same as approver
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockApprover);
      (crud.findOrFail as jest.Mock).mockResolvedValue(pendingTheme);

      await expect(
        service.review('approver-1', { themeId: 'theme-1', approved: true }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.review('approver-1', { themeId: 'theme-1', approved: true }),
      ).rejects.toThrow('Cannot approve own themes');
    });

    it('should reject approval of non-pending themes', async () => {
      const privateTheme = createMockTheme({
        status: ThemeStatus.PRIVATE,
        authorId: 'user-1',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockApprover);
      (crud.findOrFail as jest.Mock).mockResolvedValue(privateTheme);

      await expect(
        service.review('approver-1', { themeId: 'theme-1', approved: true }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.review('approver-1', { themeId: 'theme-1', approved: true }),
      ).rejects.toThrow('Theme is not pending approval');
    });

    it('should reject approval of already published themes', async () => {
      const publishedTheme = createMockTheme({
        status: ThemeStatus.PUBLISHED,
        authorId: 'user-1',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockApprover);
      (crud.findOrFail as jest.Mock).mockResolvedValue(publishedTheme);

      await expect(
        service.review('approver-1', { themeId: 'theme-1', approved: true }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPendingApprovals', () => {
    it('should return pending themes for approver', async () => {
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
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockApprover);
      (prisma.resumeTheme.findMany as jest.Mock).mockResolvedValue(
        pendingThemes,
      );

      const result = await service.getPendingApprovals('approver-1');

      expect(prisma.resumeTheme.findMany).toHaveBeenCalledWith({
        where: { status: ThemeStatus.PENDING_APPROVAL },
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, name: true, email: true } } },
      });
      expect(result).toHaveLength(2);
    });

    it('should reject non-approver access', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.getPendingApprovals('user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow admin access', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.resumeTheme.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        service.getPendingApprovals('admin-1'),
      ).resolves.toBeDefined();
    });
  });

  describe('workflow: full approval cycle', () => {
    it('should complete: PRIVATE → submit → PENDING → approve → PUBLISHED', async () => {
      // Step 1: Submit
      const privateTheme = createMockTheme({ status: ThemeStatus.PRIVATE });
      (crud.findOrFail as jest.Mock).mockResolvedValueOnce(privateTheme);
      (prisma.resumeTheme.update as jest.Mock).mockResolvedValueOnce({
        ...privateTheme,
        status: ThemeStatus.PENDING_APPROVAL,
      });

      await service.submitForApproval('user-1', 'theme-1');

      // Step 2: Approve
      const pendingTheme = createMockTheme({
        status: ThemeStatus.PENDING_APPROVAL,
        authorId: 'user-1',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockApprover);
      (crud.findOrFail as jest.Mock).mockResolvedValueOnce(pendingTheme);
      (prisma.resumeTheme.update as jest.Mock).mockResolvedValueOnce({
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
      (crud.findOrFail as jest.Mock).mockResolvedValueOnce(privateTheme);
      (prisma.resumeTheme.update as jest.Mock).mockResolvedValueOnce({
        ...privateTheme,
        status: ThemeStatus.PENDING_APPROVAL,
      });

      await service.submitForApproval('user-1', 'theme-1');

      // Step 2: Reject
      const pendingTheme = createMockTheme({
        status: ThemeStatus.PENDING_APPROVAL,
        authorId: 'user-1',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockApprover);
      (crud.findOrFail as jest.Mock).mockResolvedValueOnce(pendingTheme);
      (prisma.resumeTheme.update as jest.Mock).mockResolvedValueOnce({
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
      (crud.findOrFail as jest.Mock).mockResolvedValueOnce(rejectedTheme);
      (prisma.resumeTheme.update as jest.Mock).mockResolvedValueOnce({
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
