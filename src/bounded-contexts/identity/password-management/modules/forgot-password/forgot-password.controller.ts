import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { FORGOT_PASSWORD_PORT, ForgotPasswordPort } from '../../ports/inbound';
import { ForgotPasswordDto, ForgotPasswordResponseDto } from './forgot-password.dto';

@ApiTags('Password Management')
@Controller('password')
export class ForgotPasswordController {
  constructor(
    @Inject(FORGOT_PASSWORD_PORT)
    private readonly forgotPassword: ForgotPasswordPort,
  ) {}

  @Post('forgot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Sends a password reset email if the account exists. Always returns success to prevent email enumeration.',
  })
  @ApiDataResponse(ForgotPasswordResponseDto, {
    description: 'Reset email sent (if account exists)',
  })
  async handle(@Body() dto: ForgotPasswordDto): Promise<DataResponse<ForgotPasswordResponseDto>> {
    await this.forgotPassword.execute({ email: dto.email });

    return {
      success: true,
      data: {
        message: 'If this email exists, a reset link has been sent.',
      },
    };
  }
}
