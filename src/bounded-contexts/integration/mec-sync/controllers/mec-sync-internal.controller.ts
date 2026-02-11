/**
 * MEC Sync Internal Controller
 * Internal API endpoints for MEC data synchronization (Admin only)
 */

import { Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/auth/decorators/public.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { APP_CONFIG } from '@/shared-kernel';
import {
  MecSyncHistoryResponseDto,
  MecSyncStatusResponseDto,
} from '@/shared-kernel/dtos/sdk-response.dto';
import { InternalAuthGuard } from '../guards/internal-auth.guard';
import { MecSyncOrchestratorService } from '../services/mec-sync.service';

@SdkExport({
  tag: 'mec-internal',
  description: 'Mec Internal API',
  requiresAuth: false,
})
@ApiTags('mec-internal')
@Controller('v1/mec/internal')
export class MecSyncInternalController {
  constructor(private readonly syncOrchestrator: MecSyncOrchestratorService) {}

  @Post('sync')
  @Public()
  @UseGuards(InternalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger MEC data synchronization' })
  @ApiResponse({ status: 201, type: MecSyncStatusResponseDto })
  @ApiHeader({ name: 'x-internal-token', required: true })
  async triggerSync() {
    const result = await this.syncOrchestrator.sync('api');

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
  @ApiResponse({ status: 200, type: MecSyncStatusResponseDto })
  @ApiHeader({ name: 'x-internal-token', required: true })
  async getSyncStatus() {
    const [isRunning, metadata, lastLog] = await Promise.all([
      this.syncOrchestrator.isSyncRunning(),
      this.syncOrchestrator.getSyncMetadata(),
      this.syncOrchestrator.getLastSyncLog(),
    ]);

    return { isRunning, metadata, lastSync: lastLog };
  }

  @Get('sync/history')
  @Public()
  @UseGuards(InternalAuthGuard)
  @ApiOperation({ summary: 'Get sync history' })
  @ApiResponse({ status: 200, type: [MecSyncHistoryResponseDto] })
  @ApiHeader({ name: 'x-internal-token', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSyncHistory(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT;
    const history = await this.syncOrchestrator.getSyncHistory(parsedLimit);
    return { history };
  }
}
