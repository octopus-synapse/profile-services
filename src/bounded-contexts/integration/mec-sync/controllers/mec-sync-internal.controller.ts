/**
 * MEC Sync Internal Controller
 * Internal API endpoints for MEC data synchronization (Admin only)
 */

import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { InternalAuthGuard } from '../guards/internal-auth.guard';
import { Public } from '@/bounded-contexts/identity/auth/decorators/public.decorator';
import { MecSyncOrchestratorService } from '../services/mec-sync.service';
import { APP_CONFIG } from '@octopus-synapse/profile-contracts';

@ApiTags('mec-internal')
@Controller('v1/mec/internal')
export class MecSyncInternalController {
  constructor(private readonly syncOrchestrator: MecSyncOrchestratorService) {}

  @Post('sync')
  @Public()
  @UseGuards(InternalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger MEC data synchronization' })
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
  @ApiHeader({ name: 'x-internal-token', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSyncHistory(@Query('limit') limit?: string) {
    const parsedLimit = limit
      ? parseInt(limit, 10)
      : APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT;
    const history = await this.syncOrchestrator.getSyncHistory(parsedLimit);
    return { history };
  }
}
