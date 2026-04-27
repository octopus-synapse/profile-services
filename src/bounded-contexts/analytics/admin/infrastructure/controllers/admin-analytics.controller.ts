import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { GetAdminAnalyticsOverviewUseCase } from '../../application/use-cases/get-admin-analytics-overview/get-admin-analytics-overview.use-case';
import { AdminAnalyticsOverviewDataDto } from '../../dto/admin-analytics-response.dto';

@SdkExport({ tag: 'admin-analytics', description: 'Admin Analytics API', requiresAuth: true })
@ApiTags('Admin - Analytics')
@ApiBearerAuth()
@RequirePermission(Permission.ANALYTICS_READ_ALL)
@Controller('v1/admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly getOverviewUseCase: GetAdminAnalyticsOverviewUseCase) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get platform-wide analytics overview' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month'] })
  @ApiDataResponse(AdminAnalyticsOverviewDataDto, { description: 'Platform analytics overview' })
  async getOverview(@Query('period') period?: 'day' | 'week' | 'month') {
    return this.getOverviewUseCase.execute(period ?? 'week');
  }
}
