import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { UiStateService } from './ui-state.service';

@SdkExport({ tag: 'users', description: 'Per-user UI state' })
@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('v1/me/ui-state')
export class UiStateController {
  constructor(private readonly service: UiStateService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Returns every UI-state row for the current user. UI bootstraps once and reads keys locally.',
  })
  async getAll(
    @CurrentUser() user: UserPayload,
  ): Promise<{ success: true; data: { state: Record<string, unknown> } }> {
    const state = await this.service.getAll(user.userId);
    return { success: true, data: { state } };
  }

  @Patch(':key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upsert a single UI-state key/value (idempotent).' })
  async setKey(
    @CurrentUser() user: UserPayload,
    @Param('key') key: string,
    @Body() body: { value: unknown },
  ): Promise<{ success: true; data: { key: string; value: unknown } }> {
    const data = await this.service.setKey(user.userId, key, body?.value);
    return { success: true, data };
  }

  @Delete(':key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a UI-state key.' })
  async deleteKey(
    @CurrentUser() user: UserPayload,
    @Param('key') key: string,
  ): Promise<{ success: true; data: { deleted: boolean } }> {
    await this.service.deleteKey(user.userId, key);
    return { success: true, data: { deleted: true } };
  }
}
