/**
 * Tech Niche Controller
 * Endpoints for tech niches
 */

import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TechNicheQueryService } from '../services/niche-query.service';
import { TechSkillsQueryService } from '../services/tech-skills-query.service';
import { Public } from '../../auth/decorators/public.decorator';
import type { TechNicheDto, TechSkillDto } from '../dtos';

@ApiTags('tech-niches')
@Controller('tech-niches')
export class TechNicheController {
  constructor(
    private readonly nicheQuery: TechNicheQueryService,
    private readonly queryService: TechSkillsQueryService,
  ) {}

  /** Get all tech niches */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all tech niches' })
  @ApiResponse({ status: 200, description: 'List of tech niches' })
  async getNiches(): Promise<TechNicheDto[]> {
    return this.nicheQuery.getAllNiches();
  }

  /** Get skills by niche */
  @Get(':nicheSlug/skills')
  @Public()
  @ApiOperation({ summary: 'Get skills by niche slug' })
  @ApiResponse({ status: 200, description: 'List of skills for the niche' })
  async getSkillsByNiche(
    @Param('nicheSlug') nicheSlug: string,
  ): Promise<TechSkillDto[]> {
    return this.queryService.getSkillsByNiche(nicheSlug);
  }
}
