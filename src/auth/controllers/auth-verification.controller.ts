/**
 * Auth Verification Controller
 * Handles email verification endpoints
 */

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../auth.service';
import {
  RequestVerificationDto,
  VerifyEmailDto,
} from '../dto/verification.dto';
import { Public } from '../decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthVerificationController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('verify-email/request')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request email verification' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async requestEmailVerification(@Body() dto: RequestVerificationDto) {
    return this.authService.requestEmailVerification(dto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }
}
