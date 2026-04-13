import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { AdminCollaborationService } from './admin-collaboration.service';

@SdkExport({
  tag: 'admin-collaborations',
  description: 'Admin Collaborations API',
  requiresAuth: true,
})
@ApiTags('Admin - Collaborations')
@ApiBearerAuth()
@RequirePermission(Permission.PLATFORM_MANAGE)
@Controller('v1/admin/collaborations')
export class AdminCollaborationController {
  constructor(private readonly service: AdminCollaborationService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get collaboration statistics' })
  async getStats() {
    return this.service.getStats();
  }

  @Get()
  @ApiOperation({ summary: 'List all collaborations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getCollaborations(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.service.getCollaborations({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }
}
