/**
 * Auth Password Controller
 * Handles password-related endpoints
 */

import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../auth.service';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from '../dto/verification.dto';
import { Public } from '../decorators/public.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../interfaces/auth-request.interface';
import { APP_CONSTANTS } from '../../common/constants/app.constants';

@ApiTags('auth')
@Controller('auth')
export class AuthPasswordController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @Throttle({
    default: { ttl: 60000, limit: APP_CONSTANTS.AUTH_RATE_LIMIT_MAX_REQUESTS },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Change password (authenticated)' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  async changePassword(
    @CurrentUser() user: UserPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.userId, dto);
  }
}
