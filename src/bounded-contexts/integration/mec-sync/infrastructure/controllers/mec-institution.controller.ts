/**
 * MEC Institution Controller — public read-only API.
 */

import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { APP_CONFIG } from '@/shared-kernel';
import { GetInstitutionByCodeUseCase } from '../../application/use-cases/get-institution-by-code/get-institution-by-code.use-case';
import { ListCoursesByInstitutionUseCase } from '../../application/use-cases/list-courses-by-institution/list-courses-by-institution.use-case';
import { ListInstitutionsUseCase } from '../../application/use-cases/list-institutions/list-institutions.use-case';
import { SearchInstitutionsUseCase } from '../../application/use-cases/search-institutions/search-institutions.use-case';
import {
  MecInstitutionCoursesDataDto,
  MecInstitutionDataDto,
  MecInstitutionListDataDto,
} from '../../dto/controller-response.dto';

@SdkExport({ tag: 'mec-institutions', description: 'Mec Institutions API', requiresAuth: false })
@ApiTags('mec-institutions')
@Controller('v1/mec/institutions')
export class MecInstitutionController {
  constructor(
    private readonly listInstitutionsUseCase: ListInstitutionsUseCase,
    private readonly searchInstitutionsUseCase: SearchInstitutionsUseCase,
    private readonly getInstitutionByCodeUseCase: GetInstitutionByCodeUseCase,
    private readonly listCoursesByInstitutionUseCase: ListCoursesByInstitutionUseCase,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List institutions' })
  @ApiDataResponse(MecInstitutionListDataDto, { description: 'Institutions returned' })
  @ApiQuery({ name: 'uf', required: false, description: 'Filter by state' })
  async listInstitutions(
    @Query('uf') stateCode?: string,
  ): Promise<DataResponse<MecInstitutionListDataDto>> {
    const institutions = await this.listInstitutionsUseCase.execute(stateCode);

    return { success: true, data: { institutions } };
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search institutions' })
  @ApiDataResponse(MecInstitutionListDataDto, {
    description: 'Institution search results returned',
  })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchInstitutionsByName(
    @Query('q') searchQuery: string,
    @Query('limit') limit?: string,
  ): Promise<DataResponse<MecInstitutionListDataDto>> {
    const parsedLimit = limit ? parseInt(limit, 10) : APP_CONFIG.DEFAULT_PAGE_SIZE;
    const institutions = await this.searchInstitutionsUseCase.execute(searchQuery, parsedLimit);

    return { success: true, data: { institutions } };
  }

  @Get(':codigoIes')
  @Public()
  @ApiOperation({ summary: 'Get institution by MEC code' })
  @ApiDataResponse(MecInstitutionDataDto, { description: 'Institution returned by MEC code' })
  @ApiParam({ name: 'codigoIes', type: Number })
  async getInstitutionByCodeWithCourses(
    @Param('codigoIes', ParseIntPipe) codigoIes: number,
  ): Promise<DataResponse<MecInstitutionDataDto>> {
    const institution = await this.getInstitutionByCodeUseCase.execute(codigoIes);

    return { success: true, data: { institution } };
  }

  @Get(':codigoIes/courses')
  @Public()
  @ApiOperation({ summary: 'Get courses by institution' })
  @ApiDataResponse(MecInstitutionCoursesDataDto, {
    description: 'Courses returned for institution',
  })
  @ApiParam({ name: 'codigoIes', type: Number })
  async listCoursesByInstitutionCode(
    @Param('codigoIes', ParseIntPipe) codigoIes: number,
  ): Promise<DataResponse<MecInstitutionCoursesDataDto>> {
    const courses = await this.listCoursesByInstitutionUseCase.execute(codigoIes);

    return { success: true, data: { courses } };
  }
}
