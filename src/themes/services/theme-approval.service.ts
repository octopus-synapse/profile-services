/**
 * Theme Approval Service
 * Handles submission and review workflow for public themes
 */

import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ThemeStatus, UserRole } from '@prisma/client';
import { ReviewThemeDto } from '../dto';
import { ThemeCrudService } from './theme-crud.service';

@Injectable()
export class ThemeApprovalService {
  constructor(
    private prisma: PrismaService,
    private crud: ThemeCrudService,
  ) {}

  async submitForApproval(userId: string, themeId: string) {
    const theme = await this.crud.findOrFail(themeId);

    if (theme.authorId !== userId) {
      throw new ForbiddenException('Can only submit own themes');
    }

    const validStatuses: ThemeStatus[] = [
      ThemeStatus.PRIVATE,
      ThemeStatus.REJECTED,
    ];
    if (!validStatuses.includes(theme.status)) {
      throw new BadRequestException('Theme must be private or rejected');
    }

    return this.prisma.resumeTheme.update({
      where: { id: themeId },
      data: { status: ThemeStatus.PENDING_APPROVAL, rejectionReason: null },
    });
  }

  async review(approverId: string, dto: ReviewThemeDto) {
    await this.assertIsApprover(approverId);

    const theme = await this.crud.findOrFail(dto.themeId);

    if (theme.status !== ThemeStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Theme is not pending approval');
    }
    if (theme.authorId === approverId) {
      throw new ForbiddenException('Cannot approve own themes');
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
      throw new BadRequestException('Rejection reason is required');
    }

    return this.prisma.resumeTheme.update({
      where: { id: themeId },
      data: {
        status: ThemeStatus.REJECTED,
        approvedById: approverId,
        approvedAt: new Date(),
        rejectionReason: reason,
      },
    });
  }

  private async assertIsApprover(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const validRoles: UserRole[] = [UserRole.APPROVER, UserRole.ADMIN];

    if (!user || !validRoles.includes(user.role)) {
      throw new ForbiddenException('Only approvers can perform this action');
    }
  }
}
