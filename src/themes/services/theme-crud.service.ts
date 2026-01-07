/**
 * Theme CRUD Service
 * Handles basic create, read, update, delete operations for themes
 *
 * BUG-006 FIX: Enforces max 5 themes per user limit
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ThemeStatus, UserRole, Prisma } from '@prisma/client';
import { CreateThemeDto, UpdateThemeDto } from '../dto';
import { validateLayoutConfig, validateSectionsConfig } from '../validators';
import { ERROR_MESSAGES } from '../../common/constants/config';

/** Maximum themes a user can create */
const MAX_THEMES_PER_USER = 5;

@Injectable()
export class ThemeCrudService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateThemeDto) {
    this.validateConfig(dto.styleConfig);

    // BUG-006 FIX: Check theme limit before creating
    const existingThemeCount = await this.prisma.resumeTheme.count({
      where: { authorId: userId },
    });

    if (existingThemeCount >= MAX_THEMES_PER_USER) {
      throw new UnprocessableEntityException(
        ERROR_MESSAGES.THEME_LIMIT_REACHED,
      );
    }

    return this.prisma.resumeTheme.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        tags: dto.tags ?? [],
        styleConfig: dto.styleConfig as Prisma.InputJsonValue,
        parentThemeId: dto.parentThemeId,
        authorId: userId,
        status: ThemeStatus.PRIVATE,
      },
    });
  }

  async update(userId: string, themeId: string, dto: UpdateThemeDto) {
    const theme = await this.findOrFail(themeId);
    await this.assertCanEdit(theme, userId);

    if (dto.styleConfig) {
      this.validateConfig(dto.styleConfig);
    }

    return this.prisma.resumeTheme.update({
      where: { id: themeId },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        tags: dto.tags,
        styleConfig: dto.styleConfig as Prisma.InputJsonValue,
      },
    });
  }

  async delete(userId: string, themeId: string) {
    const theme = await this.findOrFail(themeId);

    if (theme.isSystemTheme) {
      throw new ForbiddenException(ERROR_MESSAGES.CANNOT_DELETE_SYSTEM_THEMES);
    }
    if (theme.authorId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.CAN_ONLY_DELETE_OWN_THEMES);
    }

    return this.prisma.resumeTheme.delete({ where: { id: themeId } });
  }

  async findOrFail(id: string) {
    const theme = await this.prisma.resumeTheme.findUnique({ where: { id } });
    if (!theme) throw new NotFoundException(ERROR_MESSAGES.THEME_NOT_FOUND);
    return theme;
  }

  /**
   * Submit a theme for approval (status change to PENDING_APPROVAL)
   * BUG-007: Delegates to ThemeApprovalService but exposed here for convenience
   */
  async submitForApproval(userId: string, themeId: string) {
    const theme = await this.findOrFail(themeId);

    if (theme.authorId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.CAN_ONLY_SUBMIT_OWN_THEMES);
    }

    const validStatuses: ThemeStatus[] = [
      ThemeStatus.PRIVATE,
      ThemeStatus.REJECTED,
    ];
    if (!validStatuses.includes(theme.status)) {
      throw new ForbiddenException(
        ERROR_MESSAGES.THEME_MUST_BE_PRIVATE_OR_REJECTED,
      );
    }

    return this.prisma.resumeTheme.update({
      where: { id: themeId },
      data: { status: ThemeStatus.PENDING_APPROVAL, rejectionReason: null },
    });
  }

  /**
   * Reject a theme (admin action)
   */
  async rejectTheme(adminId: string, themeId: string, reason: string) {
    await this.assertIsAdmin(adminId);
    const theme = await this.findOrFail(themeId);

    if (theme.status !== ThemeStatus.PENDING_APPROVAL) {
      throw new ForbiddenException(ERROR_MESSAGES.THEME_NOT_PENDING_APPROVAL);
    }

    return this.prisma.resumeTheme.update({
      where: { id: themeId },
      data: {
        status: ThemeStatus.REJECTED,
        rejectionReason: reason,
        approvedById: adminId,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * BUG-013 FIX: Admin can create themes directly as PUBLISHED
   */
  async createAsAdmin(adminId: string, dto: CreateThemeDto) {
    await this.assertIsAdmin(adminId);
    this.validateConfig(dto.styleConfig);

    return this.prisma.resumeTheme.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        tags: dto.tags ?? [],
        styleConfig: dto.styleConfig as Prisma.InputJsonValue,
        parentThemeId: dto.parentThemeId,
        authorId: adminId,
        status: ThemeStatus.PUBLISHED,
        approvedById: adminId,
        approvedAt: new Date(),
        publishedAt: new Date(),
      },
    });
  }

  private async assertIsAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.ONLY_ADMINS_CAN_DO_THIS);
    }
  }

  private validateConfig(config: Record<string, unknown>) {
    if (config.layout) validateLayoutConfig(config.layout);
    if (config.sections) validateSectionsConfig(config.sections);
  }

  private async assertCanEdit(
    theme: { authorId: string; isSystemTheme: boolean },
    userId: string,
  ) {
    if (theme.isSystemTheme) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== UserRole.ADMIN) {
        throw new ForbiddenException(
          ERROR_MESSAGES.ONLY_ADMINS_CAN_EDIT_SYSTEM_THEMES,
        );
      }
    } else if (theme.authorId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.CAN_ONLY_EDIT_OWN_THEMES);
    }
  }
}
