/**
 * MEC Sync Internal Controller — admin-only endpoints for triggering
 * and inspecting MEC syncs. Protected by `InternalAuthGuard`.
 */

import { Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { APP_CONFIG } from '@/shared-kernel';
import { MecSyncUseCases } from '../../application/ports/mec-sync.port';
import { TriggerMecSyncRequestDto } from '../../dto/controller-request.dto';
import {
  MecSyncExecutionDataDto,
  MecSyncHistoryDataDto,
  MecSyncStatusDataDto,
} from '../../dto/controller-response.dto';
import { InternalAuthGuard } from '../guards/internal-auth.guard';

@SdkExport({ tag: 'mec-internal', description: 'Mec Internal API', requiresAuth: false })
@ApiTags('mec-internal')
@Controller('v1/mec/internal')
export class MecSyncInternalController {
  constructor(private readonly bc: MecSyncUseCases) {}

  @Post('sync')
  @Public()
  @UseGuards(InternalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger MEC data synchronization' })
  @ApiBody({ type: TriggerMecSyncRequestDto })
  @ApiDataResponse(MecSyncExecutionDataDto, {
    description: 'Sync completed successfully',
    status: 201,
  })
  @ApiHeader({ name: 'x-internal-token', required: true })
  async triggerSync(): Promise<DataResponse<MecSyncExecutionDataDto>> {
    const result = await this.bc.triggerMecSync.execute('api');

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

  @Get('sync/status')
  @Public()
  @UseGuards(InternalAuthGuard)
  @ApiOperation({ summary: 'Get sync status' })
  @ApiDataResponse(MecSyncStatusDataDto, { description: 'Sync status returned' })
  @ApiHeader({ name: 'x-internal-token', required: true })
  async getSyncStatus(): Promise<DataResponse<MecSyncStatusDataDto>> {
    const status = await this.bc.getSyncStatus.execute();

    return {
      success: true,
      data: {
        isRunning: status.isRunning,
        metadata: status.metadata,
        lastSync: status.lastSync,
      },
    };
  }

  @Get('sync/history')
  @Public()
  @UseGuards(InternalAuthGuard)
  @ApiOperation({ summary: 'Get sync history' })
  @ApiDataResponse(MecSyncHistoryDataDto, { description: 'Sync history returned' })
  @ApiHeader({ name: 'x-internal-token', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSyncHistory(
    @Query('limit') limit?: string,
  ): Promise<DataResponse<MecSyncHistoryDataDto>> {
    const parsedLimit = limit ? parseInt(limit, 10) : APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT;
    const history = await this.bc.getSyncHistory.execute(parsedLimit);

    return { success: true, data: { history } };
  }
}
