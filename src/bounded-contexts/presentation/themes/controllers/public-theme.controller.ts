/**
 * Public Theme Routes
 * No authentication required
 */

import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
import { ThemeQueryService } from '../services';

@SdkExport({ tag: 'themes', description: 'Themes API' })
@ApiTags('themes')
@Controller('v1/themes')
export class PublicThemeController {
  constructor(private queryService: ThemeQueryService) {}

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
