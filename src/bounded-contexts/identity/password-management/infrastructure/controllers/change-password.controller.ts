import { Body, Controller, HttpCode, HttpStatus, Inject, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure/guards/jwt-auth.guard';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { ChangePasswordPort } from '../../application/ports';
import { CHANGE_PASSWORD_PORT } from '../../application/ports';
import { ChangePasswordDto, ChangePasswordResponseDto } from './change-password.dto';

interface AuthenticatedUser {
  id: string;
}

@SdkExport({
  tag: 'users',
  description: 'Password Management API',
  requiresAuth: true,
})
@ApiTags('Password Management')
@Controller('password')
export class ChangePasswordController {
  constructor(
    @Inject(CHANGE_PASSWORD_PORT)
    private readonly changePassword: ChangePasswordPort,
  ) {}

  @Post('change')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change password',
    description:
      'Changes the password for the authenticated user after verifying the current password.',
  })
  @ApiDataResponse(ChangePasswordResponseDto, {
    description: 'Password changed successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid current password, weak new password, or same password',
  })
  @ApiUnauthorizedResponse({
    description: 'Not authenticated',
  })
  async handle(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DataResponse<ChangePasswordResponseDto>> {
    await this.changePassword.execute({
      userId: user.id,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    });

    return {
      success: true,
      data: {
        message: 'Password has been changed successfully.',
      },
    };
  }
}
