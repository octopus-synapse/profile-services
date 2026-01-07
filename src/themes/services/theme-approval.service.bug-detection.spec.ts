/**
 * Theme Approval Service Bug Detection Tests
 *
 * These tests are written from SPECIFICATIONS, not from implementation.
 * Uncle Bob: "Tests are documentation."
 *
 * EXPECTED: Some tests will FAIL - that's the point. They expose bugs.
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ThemeApprovalService } from './theme-approval.service';
import { ThemeCrudService } from './theme-crud.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ThemeStatus, UserRole } from '@prisma/client';

describe('ThemeApprovalService - Bug Detection', () => {
  let service: ThemeApprovalService;
  let mockPrisma: any;
  let mockCrud: any;

  const mockTheme = {
    id: 'theme-1',
    name: 'Test Theme',
    authorId: 'user-123',
    status: ThemeStatus.PRIVATE,
    rejectionCount: 0,
    rejectionReason: null,
  };

  const approverUser = {
    id: 'approver-1',
    role: UserRole.APPROVER,
  };

  beforeEach(async () => {
    mockPrisma = {
      resumeTheme: {
        update: mock().mockResolvedValue(mockTheme),
        findMany: mock().mockResolvedValue([]),
      },
      user: {
        findUnique: mock().mockResolvedValue(approverUser),
      },
    };

    mockCrud = {
      findOrFail: mock().mockResolvedValue(mockTheme),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThemeApprovalService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ThemeCrudService, useValue: mockCrud },
      ],
    }).compile();

    service = module.get<ThemeApprovalService>(ThemeApprovalService);
  });

  /**
   * BUG: Resubmission limit not enforced
   *
   * Business Rule: "Rejected themes:
   *                 - Can be resubmitted
   *                 - Require changes
   *                 - Limit of 2 resubmissions"
   *
   * Current behavior: No resubmission count tracking/checking
   * Expected behavior: Reject submission after 2 rejections
   */
  describe('BUG: Resubmission limit (max 2)', () => {
    it('should REJECT resubmitting theme that was rejected twice', async () => {
      mockCrud.findOrFail.mockResolvedValue({
        ...mockTheme,
        status: ThemeStatus.REJECTED,
        rejectionCount: 2, // Already rejected twice
        authorId: 'user-123',
      });

      await expect(
        service.submitForApproval('user-123', 'theme-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should include "maximum resubmissions" in error message', async () => {
      mockCrud.findOrFail.mockResolvedValue({
        ...mockTheme,
        status: ThemeStatus.REJECTED,
        rejectionCount: 2,
        authorId: 'user-123',
      });

      try {
        await service.submitForApproval('user-123', 'theme-1');
        fail('Should have thrown');
      } catch (error) {
        const msg = (error as Error).message.toLowerCase();
        expect(msg).toMatch(/maximum|limit|2|resubmit/);
      }
    });

    it('should ACCEPT resubmitting after first rejection', async () => {
      mockCrud.findOrFail.mockResolvedValue({
        ...mockTheme,
        status: ThemeStatus.REJECTED,
        rejectionCount: 1,
        authorId: 'user-123',
      });

      mockPrisma.resumeTheme.update.mockResolvedValue({
        ...mockTheme,
        status: ThemeStatus.PENDING_APPROVAL,
      });

      const result = await service.submitForApproval('user-123', 'theme-1');
      expect(result.status).toBe(ThemeStatus.PENDING_APPROVAL);
    });

    it('should ACCEPT first submission (rejectionCount = 0)', async () => {
      mockCrud.findOrFail.mockResolvedValue({
        ...mockTheme,
        status: ThemeStatus.PRIVATE,
        rejectionCount: 0,
        authorId: 'user-123',
      });

      mockPrisma.resumeTheme.update.mockResolvedValue({
        ...mockTheme,
        status: ThemeStatus.PENDING_APPROVAL,
      });

      const result = await service.submitForApproval('user-123', 'theme-1');
      expect(result.status).toBe(ThemeStatus.PENDING_APPROVAL);
    });
  });

  /**
   * BUG: rejection should increment rejectionCount
   *
   * Business Rule: Track number of rejections to enforce the limit
   */
  describe('BUG: rejectionCount tracking', () => {
    it('should INCREMENT rejectionCount when theme is rejected', async () => {
      mockCrud.findOrFail.mockResolvedValue({
        ...mockTheme,
        status: ThemeStatus.PENDING_APPROVAL,
        rejectionCount: 0,
        authorId: 'other-user',
      });

      await service.review('approver-1', {
        themeId: 'theme-1',
        approved: false,
        rejectionReason: 'Needs improvement',
      });

      expect(mockPrisma.resumeTheme.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rejectionCount: { increment: 1 },
          }),
        }),
      );
    });

    it('should NOT increment rejectionCount when theme is approved', async () => {
      mockCrud.findOrFail.mockResolvedValue({
        ...mockTheme,
        status: ThemeStatus.PENDING_APPROVAL,
        rejectionCount: 1,
        authorId: 'other-user',
      });

      await service.review('approver-1', {
        themeId: 'theme-1',
        approved: true,
      });

      expect(mockPrisma.resumeTheme.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rejectionCount: expect.anything(),
          }),
        }),
      );
    });
  });

  /**
   * Theme status transitions
   *
   * Business Rule: "States: PRIVATE → PENDING → APPROVED/REJECTED"
   */
  describe('Status transitions', () => {
    it('should only allow PRIVATE → PENDING transition', async () => {
      mockCrud.findOrFail.mockResolvedValue({
        ...mockTheme,
        status: ThemeStatus.PRIVATE,
        authorId: 'user-123',
      });

      await service.submitForApproval('user-123', 'theme-1');
      expect(mockPrisma.resumeTheme.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ThemeStatus.PENDING_APPROVAL,
          }),
        }),
      );
    });

    it('should only allow REJECTED → PENDING transition (resubmission)', async () => {
      mockCrud.findOrFail.mockResolvedValue({
        ...mockTheme,
        status: ThemeStatus.REJECTED,
        rejectionCount: 0,
        authorId: 'user-123',
      });

      await service.submitForApproval('user-123', 'theme-1');
      expect(mockPrisma.resumeTheme.update).toHaveBeenCalled();
    });

    it('should REJECT submitting from PUBLISHED status', async () => {
      mockCrud.findOrFail.mockResolvedValue({
        ...mockTheme,
        status: ThemeStatus.PUBLISHED,
        authorId: 'user-123',
      });

      await expect(
        service.submitForApproval('user-123', 'theme-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  /**
   * Audit trail
   *
   * Business Rule: "Every action must generate audit record"
   */
  describe('Audit trail', () => {
    beforeEach(() => {
      mockPrisma.auditLog = { create: mock() };
    });

    it('should create audit log when theme is submitted', async () => {
      mockCrud.findOrFail.mockResolvedValue({
        ...mockTheme,
        status: ThemeStatus.PRIVATE,
        authorId: 'user-123',
      });

      await service.submitForApproval('user-123', 'theme-1');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: expect.stringMatching(/SUBMIT|THEME_SUBMITTED/i),
          }),
        }),
      );
    });

    it('should create audit log when theme is approved', async () => {
      mockCrud.findOrFail.mockResolvedValue({
        ...mockTheme,
        status: ThemeStatus.PENDING_APPROVAL,
        authorId: 'other-user',
      });

      await service.review('approver-1', {
        themeId: 'theme-1',
        approved: true,
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: expect.stringMatching(/APPROVE|THEME_APPROVED/i),
          }),
        }),
      );
    });

    it('should create audit log when theme is rejected', async () => {
      mockCrud.findOrFail.mockResolvedValue({
        ...mockTheme,
        status: ThemeStatus.PENDING_APPROVAL,
        authorId: 'other-user',
      });

      await service.review('approver-1', {
        themeId: 'theme-1',
        approved: false,
        rejectionReason: 'Needs work',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: expect.stringMatching(/REJECT|THEME_REJECTED/i),
          }),
        }),
      );
    });
  });
});
