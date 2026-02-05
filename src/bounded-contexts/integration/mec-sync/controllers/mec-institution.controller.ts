/**
 * MEC Institution Controller
 * Public API endpoints for MEC institution queries
 */

import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { MecInstitutionDto } from '@/shared-kernel/dtos/sdk-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Public } from '@/bounded-contexts/identity/auth/decorators/public.decorator';
import { InstitutionQueryService } from '../services/institution-query.service';
import { CourseQueryService } from '../services/course-query.service';
import { APP_CONFIG } from '@/shared-kernel';

@SdkExport({
  tag: 'mec-institutions',
  description: 'Mec Institutions API',
  requiresAuth: false,
})
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
  @ApiResponse({ status: 200, type: [MecInstitutionDto] })
  @ApiQuery({ name: 'uf', required: false, description: 'Filter by state' })
  async listInstitutions(@Query('uf') stateCode?: string) {
    return stateCode
      ? this.institutionQuery.listInstitutionsByState(stateCode)
      : this.institutionQuery.listAllActiveInstitutions();
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search institutions' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchInstitutionsByName(
    @Query('q') searchQuery: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit
      ? parseInt(limit, 10)
      : APP_CONFIG.DEFAULT_PAGE_SIZE;
    return this.institutionQuery.searchInstitutionsByName(
      searchQuery,
      parsedLimit,
    );
  }

  @Get(':codigoIes')
  @Public()
  @ApiOperation({ summary: 'Get institution by MEC code' })
  @ApiParam({ name: 'codigoIes', type: Number })
  async getInstitutionByCodeWithCourses(
    @Param('codigoIes', ParseIntPipe) codigoIes: number,
  ) {
    return this.institutionQuery.findInstitutionByCodeWithCourses(codigoIes);
  }

  @Get(':codigoIes/courses')
  @Public()
  @ApiOperation({ summary: 'Get courses by institution' })
  @ApiParam({ name: 'codigoIes', type: Number })
  async listCoursesByInstitutionCode(
    @Param('codigoIes', ParseIntPipe) codigoIes: number,
  ) {
    return this.courseQuery.listCoursesByInstitutionCode(codigoIes);
  }
}
