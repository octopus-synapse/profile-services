/**
 * Auth Password Controller
 * Handles password-related endpoints
 */

import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '@/bounded-contexts/identity/auth/auth.service';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type {
  ChangePassword,
  ResetPasswordRequest as ForgotPassword,
  NewPassword as ResetPassword,
} from '@/shared-kernel';
import { RATE_LIMIT_CONFIG } from '@/shared-kernel';
import { MessageResponseDto } from '@/shared-kernel/dtos/sdk-response.dto';
import { Public } from '../decorators/public.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import type { UserPayload } from '../interfaces/auth-request.interface';

@SdkExport({
  tag: 'auth',
  description: 'Password management - forgot, reset, change',
})
@ApiTags('auth')
@Controller('v1/auth')
export class AuthPasswordController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('forgot-password')
  @Throttle({ default: { ttl: RATE_LIMIT_CONFIG.TTL_MS, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async forgotPassword(@Body() dto: ForgotPassword) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @Throttle({
    default: {
      ttl: RATE_LIMIT_CONFIG.TTL_MS,
      limit: RATE_LIMIT_CONFIG.AUTH_MAX_REQUESTS,
    },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPassword) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Change password (authenticated)' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  async changePassword(@CurrentUser() user: UserPayload, @Body() dto: ChangePassword) {
    return this.authService.changePassword(user.userId, dto);
  }
}
