import { Controller, Get, HttpCode, HttpStatus, Inject, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { AllowUnverifiedEmail } from '@/bounded-contexts/identity/shared-kernel/infrastructure/decorators/allow-unverified-email.decorator';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure/guards/jwt-auth.guard';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { GetResendCooldownPort, SendVerificationEmailPort } from '../../application/ports';
import { GET_RESEND_COOLDOWN_PORT, SEND_VERIFICATION_EMAIL_PORT } from '../../application/ports';
import {
  ResendCooldownResponseDto,
  SendVerificationEmailResponseDto,
} from './send-verification.dto';

interface AuthenticatedUser {
  id: string;
}

@SdkExport({
  tag: 'email-verification',
  description: 'Send verification email',
})
@ApiTags('Email Verification')
@AllowUnverifiedEmail()
@Controller('email-verification')
export class SendVerificationController {
  constructor(
    @Inject(SEND_VERIFICATION_EMAIL_PORT)
    private readonly sendVerification: SendVerificationEmailPort,
    @Inject(GET_RESEND_COOLDOWN_PORT)
    private readonly getResendCooldown: GetResendCooldownPort,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send verification email',
    description: 'Sends a verification email to the authenticated user. No body required.',
  })
  @ApiDataResponse(SendVerificationEmailResponseDto, {
    description: 'Verification email sent',
  })
  @ApiConflictResponse({
    description: 'Email already verified',
  })
  @ApiTooManyRequestsResponse({
    description: 'Verification email sent too recently',
  })
  async handle(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DataResponse<SendVerificationEmailResponseDto>> {
    const cooldown = await this.sendVerification.execute({ userId: user.id });

    return {
      success: true,
      data: {
        message: 'Verification email has been sent.',
        cooldown,
      },
    };
  }

  @Get('resend-status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get verification email resend cooldown',
    description:
      'Returns how many seconds the authenticated user must wait before requesting another verification email. The UI uses this so the countdown survives page reloads.',
  })
  @ApiDataResponse(ResendCooldownResponseDto, {
    description: 'Current resend cooldown',
  })
  async resendStatus(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DataResponse<ResendCooldownResponseDto>> {
    const cooldown = await this.getResendCooldown.execute({ userId: user.id });

    return {
      success: true,
      data: cooldown,
    };
  }
}
