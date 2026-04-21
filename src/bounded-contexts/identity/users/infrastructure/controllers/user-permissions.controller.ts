/**
 * User Permissions Controller
 *
 * Exposes the current user's resolved permission keys so the UI can render
 * or hide CTAs that depend on a specific capability (e.g. "Convidar pra
 * entrevistar" only when JOB_CREATE is granted).
 */

import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { AuthorizationService } from '@/bounded-contexts/identity/authorization/application/services/authorization.service';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';

const UserPermissionsDataSchema = z.object({
  permissions: z.array(z.string()),
});

export class UserPermissionsDataDto extends createZodDto(UserPermissionsDataSchema) {}

@SdkExport({ tag: 'users', description: 'User permissions' })
@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('v1/users')
export class UserPermissionsController {
  constructor(private readonly authz: AuthorizationService) {}

  @RequirePermission(Permission.USER_PROFILE_READ)
  @Get('me/permissions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List permission keys granted to the current user (for UI gating)',
  })
  @ApiDataResponse(UserPermissionsDataDto, {
    description: 'Flat list of permission keys like "job:create"',
  })
  async listMyPermissions(@CurrentUser() user: UserPayload) {
    const permissions = await this.authz.getAllPermissions(user.userId);
    return { permissions };
  }
}
