/**
 * Public Theme Routes
 * No authentication required
 */

import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { QueryThemes } from '@/shared-kernel';
import { ThemeQueryService } from '../services';

@SdkExport({ tag: 'themes', description: 'Themes API' })
@ApiTags('themes')
@Controller('v1/themes')
export class PublicThemeController {
  constructor(private queryService: ThemeQueryService) {}

  @Get()
  @ApiOperation({ summary: 'List published themes' })
  findAllThemesWithPagination(@Query() queryOptions: QueryThemes) {
    return this.queryService.findAllThemesWithPagination(queryOptions);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular themes' })
  findPopularThemes(@Query('limit') limit?: number) {
    return this.queryService.findPopularThemes(limit);
  }

  @Get('system')
  @ApiOperation({ summary: 'Get system themes' })
  findAllSystemThemes() {
    return this.queryService.findAllSystemThemes();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get theme by ID' })
  findThemeById(@Param('id') themeId: string) {
    return this.queryService.findThemeById(themeId);
  }
}
