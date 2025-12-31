/**
 * Tech Area Controller
 * Endpoints for tech areas
 */

import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TechAreaQueryService } from '../services/area-query.service';
import { TechSkillsQueryService } from '../services/tech-skills-query.service';
import { Public } from '../../auth/decorators/public.decorator';
import type { TechAreaType } from '../interfaces';
import type { TechAreaDto, TechNicheDto } from '../dtos';

@ApiTags('tech-areas')
@Controller('tech-areas')
export class TechAreaController {
  constructor(
    private readonly areaQuery: TechAreaQueryService,
    private readonly queryService: TechSkillsQueryService,
  ) {}

  /** Get all tech areas */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all tech areas' })
  @ApiResponse({ status: 200, description: 'List of tech areas' })
  async getAreas(): Promise<TechAreaDto[]> {
    return this.areaQuery.getAllAreas();
  }

  /** Get niches by area type */
  @Get(':areaType/niches')
  @Public()
  @ApiOperation({ summary: 'Get niches by area type' })
  @ApiResponse({ status: 200, description: 'List of niches for the area' })
  async getNichesByArea(
    @Param('areaType') areaType: TechAreaType,
  ): Promise<TechNicheDto[]> {
    return this.queryService.getNichesByArea(areaType);
  }
}
