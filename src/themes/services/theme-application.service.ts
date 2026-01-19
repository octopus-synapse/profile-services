/**
 * Theme Application Service
 * Handles applying themes to resumes and managing customizations
 */

import { Injectable } from '@nestjs/common';
import type {
  ApplyThemeToResume,
  ForkTheme,
} from '@octopus-synapse/profile-contracts';
import {
  ResourceNotFoundError,
  ResourceOwnershipError,
  PermissionDeniedError,
} from '@octopus-synapse/profile-contracts';
import { ThemeCrudService } from './theme-crud.service';
import { ThemeQueryService } from './theme-query.service';
import { deepMerge } from '../utils';
import { ThemeStatus, Prisma } from '@prisma/client';
import { ERROR_MESSAGES } from '@octopus-synapse/profile-contracts';
import { ThemeRepository, ResumeRepository } from '../repositories';

@Injectable()
export class ThemeApplicationService {
  constructor(
    private readonly themeRepository: ThemeRepository,
    private readonly resumeRepository: ResumeRepository,
    private readonly crud: ThemeCrudService,
    private readonly query: ThemeQueryService,
  ) {}

  async applyToResume(userId: string, applyThemeData: ApplyThemeToResume) {
    const existingResume = await this.resumeRepository.findById(
      applyThemeData.resumeId,
    );

    if (existingResume?.userId !== userId) {
      throw new ResourceOwnershipError('resume', applyThemeData.resumeId);
    }

    // Verify theme access
    const selectedTheme = await this.query.findThemeById(
      applyThemeData.themeId,
      userId,
    );
    if (!selectedTheme) {
      throw new ResourceNotFoundError('theme', applyThemeData.themeId);
    }

    // Apply theme and increment usage
    await this.resumeRepository.applyThemeTransaction(
      applyThemeData.resumeId,
      applyThemeData.themeId,
      (applyThemeData.customizations ??
        Prisma.JsonNull) as Prisma.InputJsonValue,
    );

    return { success: true };
  }

  async forkThemeForUser(userId: string, forkThemeData: ForkTheme) {
    const originalTheme = await this.crud.findThemeByIdOrThrow(
      forkThemeData.themeId,
    );

    // Can fork published or own themes
    if (
      originalTheme.status !== ThemeStatus.PUBLISHED &&
      originalTheme.authorId !== userId
    ) {
      throw new PermissionDeniedError(ERROR_MESSAGES.CANNOT_FORK_THEME);
    }

    const forkedThemeData = {
      name: forkThemeData.name,
      description: `Forked from ${originalTheme.name}`,
      category: originalTheme.category,
      tags: originalTheme.tags,
      styleConfig: originalTheme.styleConfig as Prisma.InputJsonValue,
      parentThemeId: originalTheme.id,
      authorId: userId,
      status: ThemeStatus.PRIVATE,
    };

    return this.themeRepository.create(forkedThemeData);
  }

  async getResolvedConfig(resumeId: string, userId: string) {
    const existingResume =
      await this.resumeRepository.findByIdWithTheme(resumeId);

    if (!existingResume || existingResume.userId !== userId) {
      throw new ResourceOwnershipError('resume', resumeId);
    }

    if (!existingResume.activeTheme) {
      return null;
    }

    const baseThemeConfig = existingResume.activeTheme.styleConfig as Record<
      string,
      unknown
    >;
    const customThemeOverrides = existingResume.customTheme as Record<
      string,
      unknown
    > | null;

    if (!customThemeOverrides) return baseThemeConfig;

    return deepMerge(baseThemeConfig, customThemeOverrides);
  }
}
