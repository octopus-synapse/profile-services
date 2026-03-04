/**
 * MEC Metadata Controller
 * Public API endpoints for MEC metadata (UFs, areas, stats)
 */

import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import {
  MecKnowledgeAreasDataDto,
  MecStateCodesDataDto,
  MecStatisticsDataDto,
} from '../dto/controller-response.dto';
import { CourseQueryService } from '../services/course-query.service';
import { InstitutionQueryService } from '../services/institution-query.service';
import { MecStatsService } from '../services/mec-stats.service';

@SdkExport({
  tag: 'mec-metadata',
  description: 'Mec Metadata API',
  requiresAuth: false,
})
@ApiTags('mec-metadata')
@Controller('v1/mec')
export class MecMetadataController {
  constructor(
    private readonly institutionQuery: InstitutionQueryService,
    private readonly courseQuery: CourseQueryService,
    private readonly statsService: MecStatsService,
  ) {}

  @Get('ufs')
  @Public()
  @ApiOperation({ summary: 'List all states (UFs)' })
  @ApiDataResponse(MecStateCodesDataDto, {
    description: 'State codes returned',
  })
  async listAllStateCodes(): Promise<DataResponse<MecStateCodesDataDto>> {
    const states = await this.institutionQuery.findAllStateCodes();

    return {
      success: true,
      data: {
        states,
      },
    };
  }

  @Get('areas')
  @Public()
  @ApiOperation({ summary: 'List knowledge areas' })
  @ApiDataResponse(MecKnowledgeAreasDataDto, {
    description: 'Knowledge areas returned',
  })
  async listAllKnowledgeAreas(): Promise<DataResponse<MecKnowledgeAreasDataDto>> {
    const areas = await this.courseQuery.findAllKnowledgeAreas();

    return {
      success: true,
      data: {
        areas,
      },
    };
  }

  @Get('stats')
  @Public()
  @ApiOperation({ summary: 'Get MEC statistics' })
  @ApiDataResponse(MecStatisticsDataDto, {
    description: 'MEC statistics returned',
  })
  async getMecStatistics(): Promise<DataResponse<MecStatisticsDataDto>> {
    const stats = await this.statsService.getMecStatistics();

    return {
      success: true,
      data: {
        stats,
      },
    };
  }
}
