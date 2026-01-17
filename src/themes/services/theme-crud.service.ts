/**
 * Theme CRUD Service
 * Handles basic create, read, update, delete operations for themes
 *
 * BUG-006 FIX: Enforces max 5 themes per user limit
 *
 * Authorization: Uses permission-based access control.
 * Required permissions: theme:manage for admin operations
 */

import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ThemeStatus, Prisma } from '@prisma/client';
import { CreateTheme, UpdateTheme } from '@octopus-synapse/profile-contracts';
import {
  ResourceNotFoundError,
  ResourceOwnershipError,
  PermissionDeniedError,
} from '@octopus-synapse/profile-contracts';
import { validateLayoutConfig, validateSectionsConfig } from '../validators';
import { ERROR_MESSAGES } from '@octopus-synapse/profile-contracts';
import { AuthorizationService } from '../../authorization';
import { ThemeRepository } from '../repositories';

/** Maximum themes a user can create */
const MAX_THEMES_PER_USER = 5;

@Injectable()
export class ThemeCrudService {
  constructor(
    private readonly themeRepository: ThemeRepository,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async createThemeForUser(userId: string, themeData: CreateTheme) {
    this.validateConfig(themeData.styleConfig);

    // BUG-006 FIX: Check theme limit before creating
    const existingThemeCount = await this.themeRepository.countByAuthor(userId);

    if (existingThemeCount >= MAX_THEMES_PER_USER) {
      throw new UnprocessableEntityException(
        ERROR_MESSAGES.THEME_LIMIT_REACHED,
      );
    }

    const themeCreationData = {
      name: themeData.name,
      description: themeData.description,
      category: themeData.category,
      tags: themeData.tags ?? [],
      styleConfig: themeData.styleConfig as Prisma.InputJsonValue,
      parentThemeId: themeData.parentThemeId,
      authorId: userId,
      status: ThemeStatus.PRIVATE,
    };

    return this.themeRepository.create(themeCreationData);
  }

  async updateThemeForUser(
    userId: string,
    themeId: string,
    updateThemeData: UpdateTheme,
  ) {
    const existingTheme = await this.findThemeByIdOrThrow(themeId);
    await this.assertCanEdit(existingTheme, userId, themeId);

    if (updateThemeData.styleConfig) {
      this.validateConfig(updateThemeData.styleConfig);
    }

    const themeUpdateData = {
      name: updateThemeData.name,
      description: updateThemeData.description,
      category: updateThemeData.category,
      tags: updateThemeData.tags,
      styleConfig: updateThemeData.styleConfig as Prisma.InputJsonValue,
    };

    return this.themeRepository.update(themeId, themeUpdateData);
  }

  async deleteThemeForUser(userId: string, themeId: string) {
    const existingTheme = await this.findThemeByIdOrThrow(themeId);

    if (existingTheme.isSystemTheme) {
      throw new PermissionDeniedError(
        ERROR_MESSAGES.CANNOT_DELETE_SYSTEM_THEMES,
      );
    }
    if (existingTheme.authorId !== userId) {
      throw new ResourceOwnershipError('theme', themeId);
    }

    return this.themeRepository.delete(themeId);
  }

  async findThemeByIdOrThrow(themeId: string) {
    const foundTheme = await this.themeRepository.findById(themeId);
    if (!foundTheme) throw new ResourceNotFoundError('theme', themeId);
    return foundTheme;
  }

  /**
   * Submit a theme for approval (status change to PENDING_APPROVAL)
   * BUG-007: Delegates to ThemeApprovalService but exposed here for convenience
   */
  async submitThemeForApproval(userId: string, themeId: string) {
    const existingTheme = await this.findThemeByIdOrThrow(themeId);

    if (existingTheme.authorId !== userId) {
      throw new ResourceOwnershipError('theme', themeId);
    }

    const validStatuses: ThemeStatus[] = [
      ThemeStatus.PRIVATE,
      ThemeStatus.REJECTED,
    ];
    if (!validStatuses.includes(existingTheme.status)) {
      throw new PermissionDeniedError(
        ERROR_MESSAGES.THEME_MUST_BE_PRIVATE_OR_REJECTED,
      );
    }

    return this.themeRepository.update(themeId, {
      status: ThemeStatus.PENDING_APPROVAL,
      rejectionReason: null,
    });
  }

  /**
   * Reject a theme (admin action)
   */
  async rejectThemeByAdmin(
    adminId: string,
    themeId: string,
    rejectionReason: string,
  ) {
    await this.assertIsAdmin(adminId);
    const existingTheme = await this.findThemeByIdOrThrow(themeId);

    if (existingTheme.status !== ThemeStatus.PENDING_APPROVAL) {
      throw new PermissionDeniedError(
        ERROR_MESSAGES.THEME_NOT_PENDING_APPROVAL,
      );
    }

    return this.themeRepository.update(themeId, {
      status: ThemeStatus.REJECTED,
      rejectionReason: rejectionReason,
      approvedById: adminId,
      approvedAt: new Date(),
    });
  }

  /**
   * BUG-013 FIX: Admin can create themes directly as PUBLISHED
   */
  async createThemeAsAdmin(adminId: string, themeData: CreateTheme) {
    await this.assertIsAdmin(adminId);
    this.validateConfig(themeData.styleConfig);

    const adminThemeCreationData = {
      name: themeData.name,
      description: themeData.description,
      category: themeData.category,
      tags: themeData.tags ?? [],
      styleConfig: themeData.styleConfig as Prisma.InputJsonValue,
      parentThemeId: themeData.parentThemeId,
      authorId: adminId,
      status: ThemeStatus.PUBLISHED,
      approvedById: adminId,
      approvedAt: new Date(),
      publishedAt: new Date(),
    };

    return this.themeRepository.create(adminThemeCreationData);
  }

  private async assertIsAdmin(userId: string) {
    const hasPermission = await this.authorizationService.hasPermission(
      userId,
      'theme',
      'manage',
    );
    if (!hasPermission) {
      throw new PermissionDeniedError(ERROR_MESSAGES.ONLY_ADMINS_CAN_DO_THIS);
    }
  }

  private validateConfig(config: Record<string, unknown>) {
    if (config.layout) validateLayoutConfig(config.layout);
    if (config.sections) validateSectionsConfig(config.sections);
  }

  private async assertCanEdit(
    theme: { authorId: string; isSystemTheme: boolean },
    userId: string,
    themeId: string,
  ) {
    if (theme.isSystemTheme) {
      const hasPermission = await this.authorizationService.hasPermission(
        userId,
        'theme',
        'manage',
      );
      if (!hasPermission) {
        throw new PermissionDeniedError(
          ERROR_MESSAGES.ONLY_ADMINS_CAN_EDIT_SYSTEM_THEMES,
        );
      }
    } else if (theme.authorId !== userId) {
      throw new ResourceOwnershipError('theme', themeId);
    }
  }
}
