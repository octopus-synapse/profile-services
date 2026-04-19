import { Body, Controller, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { AuthenticatedRequest } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { ChatPreferenceService } from '../services/chat-preference.service';

const SetPinSchema = z.object({ pinned: z.boolean() });
export class SetPinDto extends createZodDto(SetPinSchema) {}

const SetMuteSchema = z.object({
  muted: z.boolean(),
  /** Optional absolute timestamp. If omitted and muted=true, mute is indefinite. */
  mutedUntil: z.string().datetime().optional(),
});
export class SetMuteDto extends createZodDto(SetMuteSchema) {}

@SdkExport({ tag: 'chat', description: 'Conversation preferences' })
@ApiTags('Chat')
@ApiBearerAuth()
@RequirePermission(Permission.CHAT_USE)
@Controller('chat/conversations/:conversationId/preferences')
export class ChatPreferenceController {
  constructor(private readonly service: ChatPreferenceService) {}

  @Post('pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pin / unpin a conversation for the current user.' })
  @ApiParam({ name: 'conversationId' })
  async setPin(
    @Param('conversationId') conversationId: string,
    @Body() dto: SetPinDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<DataResponse<{ pinned: boolean }>> {
    await this.service.setPin(conversationId, req.user.userId, dto.pinned);
    return { success: true, data: { pinned: dto.pinned } };
  }

  @Post('mute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mute / unmute notifications for a conversation.' })
  @ApiParam({ name: 'conversationId' })
  async setMute(
    @Param('conversationId') conversationId: string,
    @Body() dto: SetMuteDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<DataResponse<{ muted: boolean; mutedUntil: string | null }>> {
    const result = await this.service.setMute(
      conversationId,
      req.user.userId,
      dto.muted,
      dto.mutedUntil,
    );
    return { success: true, data: result };
  }
}
