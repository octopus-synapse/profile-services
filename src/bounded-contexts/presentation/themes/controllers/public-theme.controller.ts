/**
 * Public Theme Routes
 * No authentication required
 */

import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure/decorators/public.decorator';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { QueryThemesDto } from '@/shared-kernel';
import {
  ThemeListDataDto,
  ThemeNullableEntityDataDto,
  ThemePaginatedListDataDto,
} from '../dto/controller-response.dto';
import { ThemePreviewService } from '../infrastructure/adapters/theme-preview.adapter';
import { ThemeQueryService } from '../services';

@SdkExport({ tag: 'themes', description: 'Themes API' })
@ApiTags('themes')
@Controller('v1/themes')
export class PublicThemeController {
  constructor(
    private queryService: ThemeQueryService,
    private previewService: ThemePreviewService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List published themes' })
  @ApiDataResponse(ThemePaginatedListDataDto, {
    description: 'Published themes returned',
  })
  async findAllThemesWithPagination(
    @Query() queryOptions: QueryThemesDto,
  ): Promise<DataResponse<ThemePaginatedListDataDto>> {
    const themes = await this.queryService.findAllThemesWithPagination(queryOptions);

    return {
      success: true,
      data: {
        themes: themes.themes as Record<string, unknown>[],
        pagination: themes.pagination,
      },
    };
  }

  @Get('popular')
  @Public()
  @ApiOperation({ summary: 'Get popular themes' })
  @ApiDataResponse(ThemeListDataDto, { description: 'Popular themes returned' })
  async findPopularThemes(@Query('limit') limit?: number): Promise<DataResponse<ThemeListDataDto>> {
    const themes = await this.queryService.findPopularThemes(limit);

    return {
      success: true,
      data: {
        themes,
      },
    };
  }

  @Get('system')
  @Public()
  @ApiOperation({ summary: 'Get system themes' })
  @ApiDataResponse(ThemeListDataDto, { description: 'System themes returned' })
  async findAllSystemThemes(): Promise<DataResponse<ThemeListDataDto>> {
    const themes = await this.queryService.findAllSystemThemes();

    return {
      success: true,
      data: {
        themes,
      },
    };
  }

  @Get(':themeId/preview.pdf')
  @Public()
  @ApiOperation({ summary: 'Get or generate theme preview PDF' })
  async getThemePreview(@Param('themeId') themeId: string, @Res() res: Response): Promise<void> {
    const theme = await this.queryService.findThemeById(themeId);
    if (!theme) {
      res.status(404).json({ success: false, message: 'Theme not found' });
      return;
    }

    // If preview exists, redirect to MinIO
    if (theme.thumbnailUrl) {
      res.redirect(302, theme.thumbnailUrl);
      return;
    }

    // Generate on-demand
    const url = await this.previewService.generateAndUploadPreview(themeId);
    if (url) {
      res.redirect(302, url);
      return;
    }

    res.status(503).json({ success: false, message: 'Preview generation unavailable' });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get theme by ID' })
  @ApiDataResponse(ThemeNullableEntityDataDto, {
    description: 'Theme returned by id',
  })
  async findThemeById(
    @Param('id') themeId: string,
  ): Promise<DataResponse<ThemeNullableEntityDataDto>> {
    const theme = await this.queryService.findThemeById(themeId);

    return {
      success: true,
      data: {
        theme,
      },
    };
  }
}
