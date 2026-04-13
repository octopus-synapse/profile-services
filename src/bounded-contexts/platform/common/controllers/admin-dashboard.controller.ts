import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
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
  async getMetrics() {
    const metrics = await this.service.getMetrics();
    return { success: true, data: metrics };
  }
}
