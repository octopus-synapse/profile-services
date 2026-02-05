/**
 * Auth Verification Controller
 * Handles email verification endpoints
 */

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Throttle } from '@nestjs/throttler';
import { MessageResponseDto } from '@/shared-kernel/dtos/sdk-response.dto';
import { RATE_LIMIT_CONFIG } from '@/shared-kernel';
import { AuthService } from '@/bounded-contexts/identity/auth/auth.service';
import type {
  RequestVerification,
  EmailVerification as VerifyEmail,
} from '@/shared-kernel';
import { Public } from '../decorators/public.decorator';

@SdkExport({ tag: 'auth', description: 'Auth API', requiresAuth: false })
@ApiTags('auth')
@Controller('v1/auth')
export class AuthVerificationController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('verify-email/request')
  @Throttle({ default: { ttl: RATE_LIMIT_CONFIG.TTL_MS, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request email verification' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async requestEmailVerification(@Body() dto: RequestVerification) {
    return this.authService.requestEmailVerification(dto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with token' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() dto: VerifyEmail) {
    return this.authService.verifyEmail(dto);
  }
}
