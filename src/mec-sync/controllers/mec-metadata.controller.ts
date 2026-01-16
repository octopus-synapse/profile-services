/**
 * MEC Metadata Controller
 * Public API endpoints for MEC metadata (UFs, areas, stats)
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { InstitutionQueryService } from '../services/institution-query.service';
import { CourseQueryService } from '../services/course-query.service';
import { MecStatsService } from '../services/mec-stats.service';

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
  async listAllStateCodes() {
    return this.institutionQuery.findAllStateCodes();
  }

  @Get('areas')
  @Public()
  @ApiOperation({ summary: 'List knowledge areas' })
  async listAllKnowledgeAreas() {
    return this.courseQuery.findAllKnowledgeAreas();
  }

  @Get('stats')
  @Public()
  @ApiOperation({ summary: 'Get MEC statistics' })
  async getMecStatistics() {
    return this.statsService.getMecStatistics();
  }
}
