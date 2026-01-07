/**
 * Theme Approval Resubmission Limit Bug Detection Tests
 *
 * Uncle Bob (sem café): "O tema pode ser rejeitado e resubmetido
 * INFINITAMENTE! A regra de máximo 2 resubmissões? INEXISTENTE!"
 *
 * BUG-007: No Theme Resubmission Limit (max 2)
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ThemeApprovalService } from './theme-approval.service';
import { ThemeCrudService } from './theme-crud.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ThemeStatus, UserRole } from '@prisma/client';

describe('ThemeApprovalService - RESUBMISSION LIMIT BUG DETECTION', () => {
  let service: ThemeApprovalService;
  let mockCrud: { findOrFail: any };
  let mockPrisma: {
    resumeTheme: { update: any };
    user: { findUnique: any };
  };

  beforeEach(async () => {
    mockCrud = {
      findOrFail: mock(),
    };

    mockPrisma = {
      resumeTheme: {
        update: mock(),
      },
      user: {
        findUnique: mock(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThemeApprovalService,
        { provide: ThemeCrudService, useValue: mockCrud },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ThemeApprovalService>(ThemeApprovalService);
  });

  describe('BUG-007: Resubmission Limit (max 2)', () => {
    /**
     * CRITICAL BUG: Theme can be resubmitted infinitely!
     *
     * Business Rule: "Temas rejeitados podem ser resubmetidos,
     * limite de 2 resubmissões."
     *
     * Expected: Should throw BadRequestException on 3rd resubmission
     * Actual: Allows unlimited resubmissions
     */
    it('should REJECT 3rd resubmission after 2 rejections', async () => {
      const twiceRejectedTheme = {
        id: 'theme-1',
        name: 'Rejected Theme',
        authorId: 'user-123',
        status: ThemeStatus.REJECTED,
        rejectionCount: 2, // Already rejected twice!
      };
      mockCrud.findOrFail.mockResolvedValue(twiceRejectedTheme);

      // BUG: This should throw but doesn't!
      await expect(
        service.submitForApproval('user-123', 'theme-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should ALLOW 1st resubmission after rejection', async () => {
      const onceRejectedTheme = {
        id: 'theme-1',
        name: 'Rejected Theme',
        authorId: 'user-123',
        status: ThemeStatus.REJECTED,
        rejectionCount: 1,
      };
      mockCrud.findOrFail.mockResolvedValue(onceRejectedTheme);
      mockPrisma.resumeTheme.update.mockResolvedValue({
        ...onceRejectedTheme,
        status: ThemeStatus.PENDING_APPROVAL,
      });

      const result = await service.submitForApproval('user-123', 'theme-1');
      expect(result.status).toBe(ThemeStatus.PENDING_APPROVAL);
    });

    it('should ALLOW 2nd resubmission after rejection', async () => {
      const onceRejectedTheme = {
        id: 'theme-1',
        name: 'Rejected Theme',
        authorId: 'user-123',
        status: ThemeStatus.REJECTED,
        rejectionCount: 1, // First rejection, this is 2nd submission
      };
      mockCrud.findOrFail.mockResolvedValue(onceRejectedTheme);
      mockPrisma.resumeTheme.update.mockResolvedValue({
        ...onceRejectedTheme,
        status: ThemeStatus.PENDING_APPROVAL,
      });

      const result = await service.submitForApproval('user-123', 'theme-1');
      expect(result.status).toBe(ThemeStatus.PENDING_APPROVAL);
    });

    it('should increment rejectionCount when theme is rejected', async () => {
      const pendingTheme = {
        id: 'theme-1',
        name: 'Pending Theme',
        authorId: 'user-123',
        status: ThemeStatus.PENDING_APPROVAL,
        rejectionCount: 0,
      };
      mockCrud.findOrFail.mockResolvedValue(pendingTheme);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-123',
        role: UserRole.ADMIN,
      });
      mockPrisma.resumeTheme.update.mockResolvedValue({
        ...pendingTheme,
        status: ThemeStatus.REJECTED,
        rejectionCount: 1,
      });

      await service.review('admin-123', {
        themeId: 'theme-1',
        approved: false,
        rejectionReason: 'Needs improvement',
      });

      // BUG: rejectionCount is never incremented!
      expect(mockPrisma.resumeTheme.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rejectionCount: { increment: 1 },
          }),
        }),
      );
    });
  });
});
