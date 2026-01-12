/**
 * MEC Institution Controller
 * Public API endpoints for MEC institution queries
 */

import { Controller, Get, Query, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { InstitutionQueryService } from '../services/institution-query.service';
import { CourseQueryService } from '../services/course-query.service';
import { APP_CONFIG } from '@octopus-synapse/profile-contracts';

@ApiTags('mec-institutions')
@Controller('v1/mec/institutions')
export class MecInstitutionController {
  constructor(
    private readonly institutionQuery: InstitutionQueryService,
    private readonly courseQuery: CourseQueryService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List institutions' })
  @ApiQuery({ name: 'uf', required: false, description: 'Filter by state' })
  async listInstitutions(@Query('uf') uf?: string) {
    return uf
      ? this.institutionQuery.listByState(uf)
      : this.institutionQuery.listAll();
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search institutions' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchInstitutions(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit
      ? parseInt(limit, 10)
      : APP_CONFIG.DEFAULT_PAGE_SIZE;
    return this.institutionQuery.search(query, parsedLimit);
  }

  @Get(':codigoIes')
  @Public()
  @ApiOperation({ summary: 'Get institution by MEC code' })
  @ApiParam({ name: 'codigoIes', type: Number })
  async getInstitutionByCode(
    @Param('codigoIes', ParseIntPipe) codigoIes: number,
  ) {
    return this.institutionQuery.getByCode(codigoIes);
  }

  @Get(':codigoIes/courses')
  @Public()
  @ApiOperation({ summary: 'Get courses by institution' })
  @ApiParam({ name: 'codigoIes', type: Number })
  async listCoursesByInstitution(
    @Param('codigoIes', ParseIntPipe) codigoIes: number,
  ) {
    return this.courseQuery.listByInstitution(codigoIes);
  }
}
