/**
 * Tech Niche Controller
 * Endpoints for tech niches
 */

import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { TechNicheListDataDto, TechSkillListDataDto } from '../dto/controller-response.dto';
import { TechNicheQueryService } from '../services/niche-query.service';
import { TechSkillsQueryService } from '../services/tech-skills-query.service';

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
  @RequirePermission(Permission.SKILL_READ)
  @ApiOperation({ summary: 'Get all tech niches' })
  @ApiDataResponse(TechNicheListDataDto, { description: 'List of tech niches' })
  async getNiches(): Promise<DataResponse<TechNicheListDataDto>> {
    const niches = await this.nicheQuery.getAllNiches();
    return { success: true, data: { niches } };
  }

  /** Get skills by niche */
  @Get(':nicheSlug/skills')
  @RequirePermission(Permission.SKILL_READ)
  @ApiOperation({ summary: 'Get skills by niche slug' })
  @ApiParam({ name: 'nicheSlug', description: 'Niche slug', type: String })
  @ApiDataResponse(TechSkillListDataDto, {
    description: 'List of skills for the niche',
  })
  async getSkillsByNiche(
    @Param('nicheSlug') nicheSlug: string,
  ): Promise<DataResponse<TechSkillListDataDto>> {
    const skills = await this.queryService.getSkillsByNiche(nicheSlug);
    return { success: true, data: { skills } };
  }
}
