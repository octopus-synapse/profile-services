/**
 * Auth Verification Controller
 * Handles email verification endpoints
 */

import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from '@/bounded-contexts/identity/auth/auth.service';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { EmailVerification, RequestVerification } from '@/shared-kernel';
import { RATE_LIMIT_CONFIG } from '@/shared-kernel';
import { MessageResponseDto } from '@/shared-kernel/dtos/sdk-response.dto';
import { AllowUnverifiedEmail } from '../decorators/allow-unverified-email.decorator';
import { Public } from '../decorators/public.decorator';
import { SkipTosCheck } from '../decorators/skip-tos-check.decorator';

@SdkExport({ tag: 'auth', description: 'Auth API', requiresAuth: false })
@ApiTags('auth')
@Controller('v1/auth')
export class AuthVerificationController {
  constructor(private readonly authService: AuthService) {}

  @AllowUnverifiedEmail()
  @SkipTosCheck() // User needs to verify email before accepting ToS
  @Post('verify-email/request')
  @Throttle({ default: { ttl: RATE_LIMIT_CONFIG.TTL_MS, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request email verification' })
  @ApiDataResponse(MessageResponseDto, {
    description: 'Verification email sent',
  })
  async requestEmailVerification(
    @Body() dto: RequestVerification,
    @Req() req: Request & { user?: { userId: string } },
  ): Promise<DataResponse<MessageResponseDto>> {
    const userId = req.user?.userId;
    const result = await this.authService.requestEmailVerification(dto, userId);
    return { success: true, data: result };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with token' })
  @ApiDataResponse(MessageResponseDto, {
    description: 'Email verified successfully',
  })
  async verifyEmail(@Body() dto: EmailVerification): Promise<DataResponse<MessageResponseDto>> {
    const result = await this.authService.verifyEmail(dto);
    return { success: true, data: result };
  }
}
