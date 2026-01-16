/**
 * Platform Stats Controller
 *
 * Endpoints for platform statistics and monitoring.
 * Protected by permission system - any role with required permissions can access.
 *
 * Single Responsibility: HTTP interface for platform statistics.
 */

import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard, RequirePermission } from '../../authorization';
import { PlatformStatsService } from '../services/platform-stats.service';

@ApiTags('platform')
@ApiBearerAuth('JWT-auth')
@Controller('v1/platform')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PlatformStatsController {
  constructor(private readonly statsService: PlatformStatsService) {}

  @Get('stats')
  @RequirePermission('stats', 'read')
  @ApiOperation({ summary: 'Get platform statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics() {
    return this.statsService.getStatistics();
  }
}
