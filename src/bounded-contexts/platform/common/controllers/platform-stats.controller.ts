/**
 * Platform Stats Controller
 *
 * Endpoints for platform statistics and monitoring.
 * Protected by permission system - any role with required permissions can access.
 *
 * Single Responsibility: HTTP interface for platform statistics.
 */

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { PermissionGuard, RequirePermission } from '@/bounded-contexts/identity/authorization';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { PlatformStatsResponseDto } from '@/shared-kernel';
import { PlatformStatsService } from '../services/platform-stats.service';

@SdkExport({ tag: 'platform', description: 'Platform API' })
@ApiTags('platform')
@ApiBearerAuth('JWT-auth')
@Controller('v1/platform')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PlatformStatsController {
  constructor(private readonly statsService: PlatformStatsService) {}

  @Get('stats')
  @RequirePermission('stats', 'read')
  @ApiOperation({ summary: 'Get platform statistics' })
  @ApiResponse({ status: 200, type: PlatformStatsResponseDto })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics() {
    return this.statsService.getStatistics();
  }
}
