/**
 * Tech Niche Controller
 * Endpoints for tech niches
 */

import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { TechNicheQueryService } from '../services/niche-query.service';
import { TechSkillsQueryService } from '../services/tech-skills-query.service';
import { Public } from '@/bounded-contexts/identity/auth/decorators/public.decorator';
import type { TechNiche, TechSkill } from '../dtos';
import { TechNicheDto, TechSkillDto } from '@/shared-kernel';

@SdkExport({
  tag: 'tech-niches',
  description: 'Tech Niches API',
  requiresAuth: false,
})
@ApiTags('tech-niches')
@Controller('v1/tech-niches')
export class TechNicheController {
  constructor(
    private readonly nicheQuery: TechNicheQueryService,
    private readonly queryService: TechSkillsQueryService,
  ) {}

  /** Get all tech niches */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all tech niches' })
  @ApiResponse({ status: 200, type: [TechNicheDto] })
  @ApiResponse({ status: 200, description: 'List of tech niches' })
  async getNiches(): Promise<TechNiche[]> {
    return this.nicheQuery.getAllNiches();
  }

  /** Get skills by niche */
  @Get(':nicheSlug/skills')
  @Public()
  @ApiOperation({ summary: 'Get skills by niche slug' })
  @ApiResponse({ status: 200, type: [TechSkillDto] })
  @ApiResponse({ status: 200, description: 'List of skills for the niche' })
  async getSkillsByNiche(
    @Param('nicheSlug') nicheSlug: string,
  ): Promise<TechSkill[]> {
    return this.queryService.getSkillsByNiche(nicheSlug);
  }
}
