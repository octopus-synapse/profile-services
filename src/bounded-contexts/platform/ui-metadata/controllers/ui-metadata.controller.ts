import { Controller, Get, HttpCode, HttpStatus, NotFoundException, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { type EnumDescriptor, getEnum, listEnumKeys } from '../services/enum-catalog';
import { MenuService } from '../services/menu.service';
import type { MenuNode } from '../services/menu-builder';

@SdkExport({ tag: 'ui-metadata', description: 'Server-driven UI metadata' })
@ApiTags('ui-metadata')
@ApiBearerAuth('JWT-auth')
@Controller('v1')
export class UiMetadataController {
  constructor(private readonly menuService: MenuService) {}

  @Public()
  @Get('enums')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all enum keys exposed by the catalog.' })
  listEnums(): { success: true; data: { keys: string[] } } {
    return { success: true, data: { keys: listEnumKeys() } };
  }

  @Public()
  @Get('enums/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Full descriptor for a UI enum (notification-types, job-application-event-types, etc.) with localized labels + icon hints.',
  })
  getEnumByKey(@Param('key') key: string): { success: true; data: EnumDescriptor } {
    const out = getEnum(key);
    if (!out) throw new NotFoundException(`Unknown enum: ${key}`);
    return { success: true, data: out };
  }

  @Get('me/menu')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Permission-aware navigation tree for the current user with labels in the request locale.',
  })
  async getMenu(
    @CurrentUser() user: UserPayload,
  ): Promise<{ success: true; data: { menu: MenuNode[] } }> {
    const menu = await this.menuService.getMenuFor(user.userId);
    return { success: true, data: { menu } };
  }
}
