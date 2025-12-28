/**
 * Theme CRUD Service
 * Handles basic create, read, update, delete operations for themes
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ThemeStatus, UserRole, Prisma } from '@prisma/client';
import { CreateThemeDto, UpdateThemeDto } from '../dto';
import { validateLayoutConfig, validateSectionsConfig } from '../validators';

@Injectable()
export class ThemeCrudService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateThemeDto) {
    this.validateConfig(dto.styleConfig);

    return this.prisma.resumeTheme.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        tags: dto.tags || [],
        styleConfig: dto.styleConfig as Prisma.InputJsonValue,
        parentThemeId: dto.parentThemeId,
        authorId: userId,
        status: ThemeStatus.PRIVATE,
      },
    });
  }

  async update(userId: string, themeId: string, dto: UpdateThemeDto) {
    const theme = await this.findOrFail(themeId);
    this.assertCanEdit(theme, userId);

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
      throw new ForbiddenException('Cannot delete system themes');
    }
    if (theme.authorId !== userId) {
      throw new ForbiddenException('Can only delete own themes');
    }

    return this.prisma.resumeTheme.delete({ where: { id: themeId } });
  }

  async findOrFail(id: string) {
    const theme = await this.prisma.resumeTheme.findUnique({ where: { id } });
    if (!theme) throw new NotFoundException('Theme not found');
    return theme;
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
        throw new ForbiddenException('Only admins can edit system themes');
      }
    } else if (theme.authorId !== userId) {
      throw new ForbiddenException('Can only edit own themes');
    }
  }
}
