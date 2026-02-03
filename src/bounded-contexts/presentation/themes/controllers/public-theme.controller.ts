/**
 * Public Theme Routes
 * No authentication required
 */

import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ThemeQueryService } from '../services';
import type { QueryThemes } from '@octopus-synapse/profile-contracts';

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
