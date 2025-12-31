/**
 * Tech Skill Controller
 * Endpoints for tech skills
 */

import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkillQueryService } from '../services/skill-query.service';
import { SkillSearchService } from '../services/skill-search.service';
import { TechSkillsQueryService } from '../services/tech-skills-query.service';
import { Public } from '../../auth/decorators/public.decorator';
import type { SkillType } from '../interfaces';
import type { TechSkillDto } from '../dtos';

@ApiTags('tech-skills')
@Controller('tech-skills')
export class TechSkillController {
  constructor(
    private readonly skillQuery: SkillQueryService,
    private readonly skillSearch: SkillSearchService,
    private readonly queryService: TechSkillsQueryService,
  ) {}

  /** Get all skills */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all tech skills' })
  @ApiResponse({ status: 200, description: 'List of tech skills' })
  async getSkills(): Promise<TechSkillDto[]> {
    return this.skillQuery.getAllSkills();
  }

  /** Search skills */
  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search tech skills' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchSkills(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ): Promise<TechSkillDto[]> {
    return this.skillSearch.searchSkills(
      query,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /** Get skills by type */
  @Get('type/:type')
  @Public()
  @ApiOperation({ summary: 'Get skills by type' })
  @ApiResponse({ status: 200, description: 'List of skills by type' })
  async getSkillsByType(
    @Param('type') type: SkillType,
    @Query('limit') limit?: string,
  ): Promise<TechSkillDto[]> {
    return this.queryService.getSkillsByType(
      type,
      limit ? parseInt(limit, 10) : 50,
    );
  }
}
