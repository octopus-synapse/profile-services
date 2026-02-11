/**
 * Tech Area Controller
 * Endpoints for tech areas
 */

import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/auth/decorators/public.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { TechAreaDto, TechNicheDto } from '@/shared-kernel';
import type { TechArea, TechNiche } from '../dtos';
import type { TechAreaType } from '../interfaces';
import { TechAreaQueryService } from '../services/area-query.service';
import { TechSkillsQueryService } from '../services/tech-skills-query.service';

@SdkExport({
  tag: 'tech-areas',
  description: 'Tech Areas API',
  requiresAuth: false,
})
@ApiTags('tech-areas')
@Controller('v1/tech-areas')
export class TechAreaController {
  constructor(
    private readonly areaQuery: TechAreaQueryService,
    private readonly queryService: TechSkillsQueryService,
  ) {}

  /** Get all tech areas */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all tech areas' })
  @ApiResponse({ status: 200, type: [TechAreaDto] })
  @ApiResponse({ status: 200, description: 'List of tech areas' })
  async getAreas(): Promise<TechArea[]> {
    return this.areaQuery.getAllAreas();
  }

  /** Get niches by area type */
  @Get(':areaType/niches')
  @Public()
  @ApiOperation({ summary: 'Get niches by area type' })
  @ApiResponse({ status: 200, type: [TechNicheDto] })
  @ApiResponse({ status: 200, description: 'List of niches for the area' })
  async getNichesByArea(@Param('areaType') areaType: TechAreaType): Promise<TechNiche[]> {
    return this.queryService.getNichesByArea(areaType);
  }
}
