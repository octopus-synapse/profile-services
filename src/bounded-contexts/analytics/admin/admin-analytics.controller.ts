import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { AdminAnalyticsService } from './admin-analytics.service';

@SdkExport({ tag: 'admin-analytics', description: 'Admin Analytics API', requiresAuth: true })
@ApiTags('Admin - Analytics')
@ApiBearerAuth()
@RequirePermission(Permission.ANALYTICS_READ_ALL)
@Controller('v1/admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly service: AdminAnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get platform-wide analytics overview' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month'] })
  async getOverview(@Query('period') period?: 'day' | 'week' | 'month') {
    const result = await this.service.getOverview(period ?? 'week');
    return { success: true, data: result };
  }
}
