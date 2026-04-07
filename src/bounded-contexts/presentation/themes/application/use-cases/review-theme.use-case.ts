/**
 * Review Theme Use Case
 *
 * Handles theme approval and rejection by approvers.
 * BUG-007 FIX: Increments rejection count on reject.
 */

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ThemeStatus } from '@prisma/client';
import type { ThemeApproval } from '@/shared-kernel';
import { ERROR_MESSAGES } from '@/shared-kernel';
import type { AuthorizationPort } from '../../domain/ports/authorization.port';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';

export class ReviewThemeUseCase {
  constructor(
    private readonly themeRepo: ThemeRepositoryPort,
    private readonly authorization: AuthorizationPort,
  ) {}

  async execute(approverId: string, dto: ThemeApproval) {
    await this.assertIsApprover(approverId);

    const theme = await this.themeRepo.findById(dto.themeId);
    if (!theme) throw new NotFoundException(ERROR_MESSAGES.THEME_NOT_FOUND);

    if (theme.status !== ThemeStatus.PENDING_APPROVAL) {
      throw new BadRequestException(ERROR_MESSAGES.THEME_NOT_PENDING_APPROVAL);
    }
    if (theme.authorId === approverId) {
      throw new ForbiddenException(ERROR_MESSAGES.CANNOT_APPROVE_OWN_THEMES);
    }

    if (dto.approved) {
      return this.approve(dto.themeId, approverId);
    }
    return this.reject(dto.themeId, approverId, dto.rejectionReason);
  }

  private async approve(themeId: string, approverId: string) {
    return this.themeRepo.update(themeId, {
      status: ThemeStatus.PUBLISHED,
      approvedById: approverId,
      approvedAt: new Date(),
      publishedAt: new Date(),
      rejectionReason: null,
    });
  }

  private async reject(themeId: string, approverId: string, reason?: string) {
    if (!reason) {
      throw new BadRequestException(ERROR_MESSAGES.REJECTION_REASON_REQUIRED);
    }

    return this.themeRepo.update(themeId, {
      status: ThemeStatus.REJECTED,
      approvedById: approverId,
      approvedAt: new Date(),
      rejectionReason: reason,
      rejectionCount: { increment: 1 },
    });
  }

  private async assertIsApprover(userId: string) {
    const hasPermission = await this.authorization.hasPermission(userId, 'theme', 'approve');
    if (!hasPermission) {
      throw new ForbiddenException('Only approvers can perform this action');
    }
  }
}
