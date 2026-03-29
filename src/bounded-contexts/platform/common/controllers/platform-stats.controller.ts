/**
 * Platform Stats Controller
 *
 * Endpoints for platform statistics and monitoring.
 * Protected by permission system - any role with required permissions can access.
 *
 * Single Responsibility: HTTP interface for platform statistics.
 */

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { PermissionGuard, RequirePermission } from '@/bounded-contexts/identity/authorization';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { PlatformStatsService } from '../services/platform-stats.service';

/** Platform statistics response DTO */
export class PlatformStatsResponseDto {
  @ApiProperty({ example: 1000 })
  totalUsers!: number;

  @ApiProperty({ example: 500 })
  totalResumes!: number;

  @ApiProperty({ example: 10000 })
  totalViews!: number;

  @ApiProperty({ example: 50 })
  activeUsersToday!: number;

  @ApiProperty({ example: 200 })
  activeUsersWeek!: number;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  updatedAt!: string;
}

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
  @ApiDataResponse(PlatformStatsResponseDto, {
    description: 'Statistics retrieved successfully',
  })
  async getStatistics(): Promise<DataResponse<PlatformStatsResponseDto>> {
    const stats = await this.statsService.getStatistics();
    return {
      success: true,
      data: {
        totalUsers: stats.users.total,
        totalResumes: stats.resumes.total,
        totalViews: 0,
        activeUsersToday: stats.users.recentSignups,
        activeUsersWeek: stats.users.recentSignups,
        updatedAt: new Date().toISOString(),
      },
    };
  }
}
