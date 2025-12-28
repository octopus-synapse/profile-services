/**
 * MEC Sync Controller
 * Handles sync operations and data queries
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiHeader } from '@nestjs/swagger';
import { MecSyncService } from './services/mec-sync.service';
import { MecQueryService } from './services/mec-query.service';
import { InternalAuthGuard } from './guards/internal-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('mec')
@Controller('mec')
export class MecSyncController {
  constructor(
    private readonly syncService: MecSyncService,
    private readonly queryService: MecQueryService,
  ) {}

  // ===== INTERNAL ENDPOINTS (Protected by secret token) =====

  @Post('internal/sync')
  @Public()
  @UseGuards(InternalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger MEC data synchronization (internal)' })
  @ApiHeader({
    name: 'x-internal-token',
    description: 'Internal API token for authentication',
    required: true,
  })
  async triggerSync() {
    const result = await this.syncService.sync('api');
    return {
      success: true,
      message: 'Sync completed successfully',
      data: {
        institutionsInserted: result.institutionsInserted,
        coursesInserted: result.coursesInserted,
        totalRowsProcessed: result.totalRowsProcessed,
        errorsCount: result.errors.length,
      },
    };
  }

  @Get('internal/sync/status')
  @Public()
  @UseGuards(InternalAuthGuard)
  @ApiOperation({ summary: 'Get sync status (internal)' })
  @ApiHeader({
    name: 'x-internal-token',
    description: 'Internal API token for authentication',
    required: true,
  })
  async getSyncStatus() {
    const [isRunning, metadata, lastLog] = await Promise.all([
      this.syncService.isSyncRunning(),
      this.syncService.getSyncMetadata(),
      this.syncService.getLastSyncLog(),
    ]);

    return {
      isRunning,
      metadata,
      lastSync: lastLog,
    };
  }

  @Get('internal/sync/history')
  @Public()
  @UseGuards(InternalAuthGuard)
  @ApiOperation({ summary: 'Get sync history (internal)' })
  @ApiHeader({
    name: 'x-internal-token',
    description: 'Internal API token for authentication',
    required: true,
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSyncHistory(@Query('limit') limit?: string) {
    const history = await this.syncService.getSyncHistory(
      limit ? parseInt(limit, 10) : 10,
    );
    return { history };
  }

  // ===== PUBLIC QUERY ENDPOINTS (For frontend consumption) =====

  @Get('institutions')
  @Public()
  @ApiOperation({ summary: 'List all institutions' })
  @ApiQuery({ name: 'uf', required: false, description: 'Filter by state (UF)' })
  async getInstitutions(@Query('uf') uf?: string) {
    if (uf) {
      return this.queryService.getInstitutionsByUf(uf);
    }
    return this.queryService.getAllInstitutions();
  }

  @Get('institutions/search')
  @Public()
  @ApiOperation({ summary: 'Search institutions by name or sigla' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchInstitutions(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    return this.queryService.searchInstitutions(
      query,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('institutions/:codigoIes')
  @Public()
  @ApiOperation({ summary: 'Get institution by MEC code' })
  @ApiParam({ name: 'codigoIes', type: Number })
  async getInstitutionByCode(
    @Param('codigoIes', ParseIntPipe) codigoIes: number,
  ) {
    return this.queryService.getInstitutionByCode(codigoIes);
  }

  @Get('institutions/:codigoIes/courses')
  @Public()
  @ApiOperation({ summary: 'Get courses by institution' })
  @ApiParam({ name: 'codigoIes', type: Number })
  async getCoursesByInstitution(
    @Param('codigoIes', ParseIntPipe) codigoIes: number,
  ) {
    return this.queryService.getCoursesByInstitution(codigoIes);
  }

  @Get('courses/search')
  @Public()
  @ApiOperation({ summary: 'Search courses by name' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchCourses(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    return this.queryService.searchCourses(
      query,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('courses/:codigoCurso')
  @Public()
  @ApiOperation({ summary: 'Get course by MEC code' })
  @ApiParam({ name: 'codigoCurso', type: Number })
  async getCourseByCode(
    @Param('codigoCurso', ParseIntPipe) codigoCurso: number,
  ) {
    return this.queryService.getCourseByCode(codigoCurso);
  }

  @Get('ufs')
  @Public()
  @ApiOperation({ summary: 'Get list of states (UFs)' })
  async getUfList() {
    return this.queryService.getUfList();
  }

  @Get('areas')
  @Public()
  @ApiOperation({ summary: 'Get list of knowledge areas' })
  async getAreasConhecimento() {
    return this.queryService.getAreasConhecimento();
  }

  @Get('stats')
  @Public()
  @ApiOperation({ summary: 'Get MEC data statistics' })
  async getStats() {
    return this.queryService.getStats();
  }
}
