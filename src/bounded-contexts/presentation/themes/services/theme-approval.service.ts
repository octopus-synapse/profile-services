/**
 * Theme Approval Service
 * Handles submission and review workflow for public themes
 *
 * BUG-007 FIX: Enforces max 2 resubmissions for rejected themes
 *
 * Authorization: Uses permission-based access control.
 * Required permission: theme:approve
 */

import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ThemeStatus } from '@prisma/client';
import type { ReviewTheme } from '@/shared-kernel';
import { ThemeCrudService } from './theme-crud.service';
import { ERROR_MESSAGES } from '@/shared-kernel';
import { AuthorizationService } from '@/bounded-contexts/identity/authorization';

/** Maximum number of times a theme can be resubmitted after rejection */
const MAX_RESUBMISSIONS = 2;

@Injectable()
export class ThemeApprovalService {
  constructor(
    private prisma: PrismaService,
    private crud: ThemeCrudService,
    private authorizationService: AuthorizationService,
  ) {}

  async submitForApproval(userId: string, themeId: string) {
    const theme = await this.crud.findThemeByIdOrThrow(themeId);

    if (theme.authorId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.CAN_ONLY_SUBMIT_OWN_THEMES);
    }

    const validStatuses: ThemeStatus[] = [
      ThemeStatus.PRIVATE,
      ThemeStatus.REJECTED,
    ];
    if (!validStatuses.includes(theme.status)) {
      throw new BadRequestException(
        ERROR_MESSAGES.THEME_MUST_BE_PRIVATE_OR_REJECTED,
      );
    }

    // BUG-007 FIX: Check resubmission count for rejected themes
    if (theme.status === ThemeStatus.REJECTED) {
      const rejectionCount = theme.rejectionCount;
      if (rejectionCount >= MAX_RESUBMISSIONS) {
        throw new UnprocessableEntityException(
          ERROR_MESSAGES.THEME_RESUBMISSION_LIMIT_REACHED,
        );
      }
    }

    return this.prisma.resumeTheme.update({
      where: { id: themeId },
      data: { status: ThemeStatus.PENDING_APPROVAL, rejectionReason: null },
    });
  }

  async review(approverId: string, dto: ReviewTheme) {
    await this.assertIsApprover(approverId);

    const theme = await this.crud.findThemeByIdOrThrow(dto.themeId);

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

  async getPendingApprovals(approverId: string) {
    await this.assertIsApprover(approverId);

    return this.prisma.resumeTheme.findMany({
      where: { status: ThemeStatus.PENDING_APPROVAL },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
  }

  private async approve(themeId: string, approverId: string) {
    return this.prisma.resumeTheme.update({
      where: { id: themeId },
      data: {
        status: ThemeStatus.PUBLISHED,
        approvedById: approverId,
        approvedAt: new Date(),
        publishedAt: new Date(),
        rejectionReason: null,
      },
    });
  }

  private async reject(themeId: string, approverId: string, reason?: string) {
    if (!reason) {
      throw new BadRequestException(ERROR_MESSAGES.REJECTION_REASON_REQUIRED);
    }

    // BUG-007 FIX: Increment rejection count on reject
    return this.prisma.resumeTheme.update({
      where: { id: themeId },
      data: {
        status: ThemeStatus.REJECTED,
        approvedById: approverId,
        approvedAt: new Date(),
        rejectionReason: reason,
        rejectionCount: { increment: 1 }, // BUG-007 FIX
      },
    });
  }

  private async assertIsApprover(userId: string) {
    const hasPermission = await this.authorizationService.hasPermission(
      userId,
      'theme',
      'approve',
    );

    if (!hasPermission) {
      throw new ForbiddenException('Only approvers can perform this action');
    }
  }
}
