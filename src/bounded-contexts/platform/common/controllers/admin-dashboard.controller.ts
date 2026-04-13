import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { AdminDashboardMetricsDataDto } from '@/bounded-contexts/platform/common/dto/admin-dashboard-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { AdminDashboardService } from '../services/admin-dashboard.service';

@SdkExport({
  tag: 'admin-dashboard',
  description: 'Admin Dashboard API',
  requiresAuth: true,
})
@ApiTags('Admin - Dashboard')
@ApiBearerAuth()
@RequirePermission(Permission.PLATFORM_STATS_READ)
@Controller('v1/admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly service: AdminDashboardService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get platform metrics for admin dashboard' })
  @ApiDataResponse(AdminDashboardMetricsDataDto, { description: 'Platform dashboard metrics' })
  async getMetrics() {
    return this.service.getMetrics();
  }
}
