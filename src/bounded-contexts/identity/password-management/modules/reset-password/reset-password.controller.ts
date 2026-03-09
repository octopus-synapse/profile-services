import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { ResetPasswordPort } from '../../ports/inbound';
import { RESET_PASSWORD_PORT } from '../../ports/inbound';
import {
  ResetPasswordDto,
  ResetPasswordResponseDto,
} from './reset-password.dto';

@SdkExport({
  tag: 'users',
  description: 'Password Management API',
  requiresAuth: false,
})
@ApiTags('Password Management')
@Controller('password')
export class ResetPasswordController {
  constructor(
    @Inject(RESET_PASSWORD_PORT)
    private readonly resetPassword: ResetPasswordPort,
  ) {}

  @Post('reset')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password with token',
    description:
      'Resets the user password using a valid reset token received via email.',
  })
  @ApiDataResponse(ResetPasswordResponseDto, {
    description: 'Password reset successful',
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired token, or weak password',
  })
  async handle(
    @Body() dto: ResetPasswordDto,
  ): Promise<DataResponse<ResetPasswordResponseDto>> {
    await this.resetPassword.execute({
      token: dto.token,
      newPassword: dto.newPassword,
    });

    return {
      success: true,
      data: {
        message: 'Password has been reset successfully.',
      },
    };
  }
}
