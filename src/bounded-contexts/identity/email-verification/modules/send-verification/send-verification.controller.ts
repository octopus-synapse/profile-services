import { Controller, HttpCode, HttpStatus, Inject, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure/guards/jwt-auth.guard';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { SendVerificationEmailPort } from '../../ports/inbound';
import { SEND_VERIFICATION_EMAIL_PORT } from '../../ports/inbound';
import { SendVerificationEmailResponseDto } from './send-verification.dto';

interface AuthenticatedUser {
  id: string;
}

@SdkExport({
  tag: 'email-verification',
  description: 'Send verification email',
})
@ApiTags('Email Verification')
@Controller('email-verification')
export class SendVerificationController {
  constructor(
    @Inject(SEND_VERIFICATION_EMAIL_PORT)
    private readonly sendVerification: SendVerificationEmailPort,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send verification email',
    description: 'Sends a verification email to the authenticated user.',
  })
  @ApiBody({ required: false, description: 'No body required - uses authenticated user' })
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
    await this.sendVerification.execute({ userId: user.id });

    return {
      success: true,
      data: {
        message: 'Verification email has been sent.',
      },
    };
  }
}
