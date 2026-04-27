import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { GetMetricsOverviewUseCase } from '../../application/use-cases/get-metrics-overview/get-metrics-overview.use-case';
import { AdminMetricsOverviewDataDto } from '../../dto/admin-metrics-response.dto';

@SdkExport({ tag: 'admin-metrics', description: 'Admin Metrics API', requiresAuth: true })
@ApiTags('Admin - Metrics')
@ApiBearerAuth()
@RequirePermission(Permission.PLATFORM_MANAGE)
@Controller('v1/admin/metrics')
export class AdminMetricsController {
  constructor(private readonly getMetricsOverview: GetMetricsOverviewUseCase) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get all metrics as JSON' })
  @ApiDataResponse(AdminMetricsOverviewDataDto, { description: 'Platform metrics overview' })
  async getOverview() {
    return this.getMetricsOverview.execute();
  }
}
