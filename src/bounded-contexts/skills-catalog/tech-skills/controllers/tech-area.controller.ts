/**
 * Tech Area Controller
 * Endpoints for tech areas
 */

import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { TechAreaDto, TechNicheDto } from '@/shared-kernel';
import type { TechArea, TechNiche } from '../dtos';
import type { TechAreaType } from '../interfaces';
import { TechAreaQueryService } from '../services/area-query.service';
import { TechSkillsQueryService } from '../services/tech-skills-query.service';

class TechAreaListDataDto {
  @ApiProperty({ type: [TechAreaDto] })
  areas!: TechArea[];
}

class TechNicheListDataDto {
  @ApiProperty({ type: [TechNicheDto] })
  niches!: TechNiche[];
}

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
  @ApiDataResponse(TechAreaListDataDto, { description: 'List of tech areas' })
  async getAreas(): Promise<DataResponse<TechAreaListDataDto>> {
    const areas = await this.areaQuery.getAllAreas();
    return { success: true, data: { areas } };
  }

  /** Get niches by area type */
  @Get(':areaType/niches')
  @Public()
  @ApiOperation({ summary: 'Get niches by area type' })
  @ApiDataResponse(TechNicheListDataDto, {
    description: 'List of niches for the area',
  })
  async getNichesByArea(
    @Param('areaType') areaType: TechAreaType,
  ): Promise<DataResponse<TechNicheListDataDto>> {
    const niches = await this.queryService.getNichesByArea(areaType);
    return { success: true, data: { niches } };
  }
}
