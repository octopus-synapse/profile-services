/**
 * MEC Metadata Controller
 * Public API endpoints for MEC metadata (UFs, areas, stats)
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Public } from '@/bounded-contexts/identity/auth/decorators/public.decorator';
import { InstitutionQueryService } from '../services/institution-query.service';
import { CourseQueryService } from '../services/course-query.service';
import { MecStatsService } from '../services/mec-stats.service';
import {
  KnowledgeAreaResponseDto,
  MecStatisticsResponseDto,
  StateCodeResponseDto,
} from '@/shared-kernel';

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
  @ApiResponse({ status: 200, type: [StateCodeResponseDto] })
  async listAllStateCodes() {
    return this.institutionQuery.findAllStateCodes();
  }

  @Get('areas')
  @Public()
  @ApiOperation({ summary: 'List knowledge areas' })
  @ApiResponse({ status: 200, type: [KnowledgeAreaResponseDto] })
  async listAllKnowledgeAreas() {
    return this.courseQuery.findAllKnowledgeAreas();
  }

  @Get('stats')
  @Public()
  @ApiOperation({ summary: 'Get MEC statistics' })
  @ApiResponse({ status: 200, type: MecStatisticsResponseDto })
  async getMecStatistics() {
    return this.statsService.getMecStatistics();
  }
}
