/**
 * Auth Password Controller
 * Handles password-related endpoints
 */

import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '@/bounded-contexts/identity/auth/auth.service';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { ChangePassword, NewPassword, ResetPasswordRequest } from '@/shared-kernel';
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
  @ApiDataResponse(MessageResponseDto, {
    description: 'Password reset email sent',
  })
  async forgotPassword(
    @Body() dto: ResetPasswordRequest,
  ): Promise<DataResponse<MessageResponseDto>> {
    const result = await this.authService.forgotPassword(dto);
    return { success: true, data: result };
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
  @ApiDataResponse(MessageResponseDto, {
    description: 'Password reset successfully',
  })
  async resetPassword(@Body() dto: NewPassword): Promise<DataResponse<MessageResponseDto>> {
    const result = await this.authService.resetPassword(dto);
    return { success: true, data: result };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Change password (authenticated)' })
  @ApiDataResponse(MessageResponseDto, {
    description: 'Password changed successfully',
  })
  async changePassword(
    @CurrentUser() user: UserPayload,
    @Body() dto: ChangePassword,
  ): Promise<DataResponse<MessageResponseDto>> {
    const result = await this.authService.changePassword(user.userId, dto);
    return { success: true, data: result };
  }
}
