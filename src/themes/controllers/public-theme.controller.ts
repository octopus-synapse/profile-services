/**
 * Public Theme Routes
 * No authentication required
 */

import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ThemeQueryService } from '../services';
import { QueryThemesDto } from '../dto';

@ApiTags('themes')
@Controller('themes')
export class PublicThemeController {
  constructor(private queryService: ThemeQueryService) {}

  @Get()
  @ApiOperation({ summary: 'List published themes' })
  findAll(@Query() query: QueryThemesDto) {
    return this.queryService.findAll(query);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular themes' })
  getPopular(@Query('limit') limit?: number) {
    return this.queryService.getPopular(limit);
  }

  @Get('system')
  @ApiOperation({ summary: 'Get system themes' })
  getSystemThemes() {
    return this.queryService.getSystemThemes();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get theme by ID' })
  findOne(@Param('id') id: string) {
    return this.queryService.findOne(id);
  }
}
