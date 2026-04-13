import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { AdminChatService } from './admin-chat.service';

@SdkExport({ tag: 'admin-chat', description: 'Admin Chat API', requiresAuth: true })
@ApiTags('Admin - Chat')
@ApiBearerAuth()
@RequirePermission(Permission.PLATFORM_MANAGE)
@Controller('v1/admin/chat')
export class AdminChatController {
  constructor(private readonly service: AdminChatService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get chat statistics' })
  async getStats() {
    return this.service.getStats();
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List all conversations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getConversations(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.service.getConversations({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }
}
