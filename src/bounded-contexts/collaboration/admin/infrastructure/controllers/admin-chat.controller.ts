import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { AdminCollaborationUseCases } from '../../application/ports/admin-collaboration.port';
import {
  AdminChatConversationsDataDto,
  AdminChatStatsDataDto,
} from '../../dto/admin-chat-response.dto';

@SdkExport({ tag: 'admin-chat', description: 'Admin Chat API', requiresAuth: true })
@ApiTags('Admin - Chat')
@ApiBearerAuth()
@RequirePermission(Permission.PLATFORM_MANAGE)
@Controller('v1/admin/chat')
export class AdminChatController {
  constructor(private readonly bc: AdminCollaborationUseCases) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get chat statistics' })
  @ApiDataResponse(AdminChatStatsDataDto, { description: 'Chat statistics' })
  async getStats() {
    return this.bc.getChatStats.execute();
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List all conversations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiDataResponse(AdminChatConversationsDataDto, { description: 'List of conversations' })
  async getConversations(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.bc.listChatConversations.execute({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }
}
