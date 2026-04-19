import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { ConnectionRecsService } from '../services/connection-recs.service';

@SdkExport({ tag: 'social', description: 'Connection recommendations API' })
@ApiTags('social')
@ApiBearerAuth('JWT-auth')
@Controller('v1/users/me/connection-recommendations')
export class ConnectionRecsController {
  constructor(private readonly service: ConnectionRecsService) {}

  @Get()
  @RequirePermission(Permission.SOCIAL_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Users sharing the most skills with you' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecs(
    @CurrentUser() user: UserPayload,
    @Query('limit') limit?: string,
  ): Promise<{
    success: true;
    data: { recommendations: unknown[] };
  }> {
    const parsed = limit ? Number.parseInt(limit, 10) : undefined;
    const recs = await this.service.getRecommendationsFor(user.userId, {
      limit: Number.isFinite(parsed) ? parsed : undefined,
    });
    return { success: true, data: { recommendations: recs } };
  }
}
