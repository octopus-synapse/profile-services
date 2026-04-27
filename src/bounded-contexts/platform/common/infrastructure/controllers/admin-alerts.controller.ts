import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { AdminAlertsDataDto } from '@/bounded-contexts/platform/common/dto/admin-alerts-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { GetAdminAlertsUseCase } from '../../application/use-cases/get-admin-alerts/get-admin-alerts.use-case';

@SdkExport({ tag: 'admin-alerts', description: 'Admin Alerts API', requiresAuth: true })
@ApiTags('Admin - Alerts')
@ApiBearerAuth()
@RequirePermission(Permission.PLATFORM_STATS_READ)
@Controller('v1/admin/alerts')
export class AdminAlertsController {
  constructor(private readonly getAlertsUseCase: GetAdminAlertsUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Counts of admin-actionable queues: reports, verifications, stale shadow profiles',
  })
  @ApiDataResponse(AdminAlertsDataDto, { description: 'Admin alert counts' })
  async getAlerts() {
    return this.getAlertsUseCase.execute();
  }
}
