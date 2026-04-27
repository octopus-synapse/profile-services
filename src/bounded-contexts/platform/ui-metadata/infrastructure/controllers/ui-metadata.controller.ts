import { Controller, Get, HttpCode, HttpStatus, NotFoundException, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { EnumDescriptor } from '../../application/services/enum-catalog';
import type { MenuNode } from '../../application/services/menu-builder';
import { GetEnumDescriptorUseCase } from '../../application/use-cases/get-enum-descriptor/get-enum-descriptor.use-case';
import { GetUserMenuUseCase } from '../../application/use-cases/get-user-menu/get-user-menu.use-case';
import { ListEnumKeysUseCase } from '../../application/use-cases/list-enum-keys/list-enum-keys.use-case';

@SdkExport({ tag: 'ui-metadata', description: 'Server-driven UI metadata' })
@ApiTags('ui-metadata')
@ApiBearerAuth('JWT-auth')
@Controller('v1')
export class UiMetadataController {
  constructor(
    private readonly listEnumKeysUseCase: ListEnumKeysUseCase,
    private readonly getEnumDescriptorUseCase: GetEnumDescriptorUseCase,
    private readonly getUserMenuUseCase: GetUserMenuUseCase,
  ) {}

  @Public()
  @Get('enums')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all enum keys exposed by the catalog.' })
  listEnums(): { success: true; data: { keys: string[] } } {
    return { success: true, data: this.listEnumKeysUseCase.execute() };
  }

  @Public()
  @Get('enums/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Full descriptor for a UI enum (notification-types, job-application-event-types, etc.) with localized labels + icon hints.',
  })
  getEnumByKey(@Param('key') key: string): { success: true; data: EnumDescriptor } {
    const out = this.getEnumDescriptorUseCase.execute(key);
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
    const menu = await this.getUserMenuUseCase.execute(user.userId);
    return { success: true, data: { menu } };
  }
}
