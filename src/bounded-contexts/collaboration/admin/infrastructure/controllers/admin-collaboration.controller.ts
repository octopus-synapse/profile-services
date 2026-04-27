import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { AdminCollaborationUseCases } from '../../application/ports/admin-collaboration.port';
import {
  AdminCollaborationStatsDataDto,
  AdminCollaborationsListDataDto,
} from '../../dto/admin-collaboration-response.dto';

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
  constructor(private readonly bc: AdminCollaborationUseCases) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get collaboration statistics' })
  @ApiDataResponse(AdminCollaborationStatsDataDto, { description: 'Collaboration statistics' })
  async getStats() {
    return this.bc.getCollaborationStats.execute();
  }

  @Get()
  @ApiOperation({ summary: 'List all collaborations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiDataResponse(AdminCollaborationsListDataDto, { description: 'List of collaborations' })
  async getCollaborations(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.bc.listCollaborations.execute({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }
}
