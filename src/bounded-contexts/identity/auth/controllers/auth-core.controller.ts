/**
 * Auth Core Controller
 * Handles signup, login, token refresh, and current user info
 */

import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { AuthService } from '@/bounded-contexts/identity/auth/auth.service';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import {
  type LoginCredentials,
  LoginCredentialsSchema,
  RATE_LIMIT_CONFIG,
  type RefreshToken,
  RefreshTokenSchema,
  type RegisterCredentials,
  RegisterCredentialsSchema,
} from '@/shared-kernel';
import { AuthResponseDto, CurrentUserResponseDto } from '@/shared-kernel/dtos/sdk-response.dto';
import { Public } from '../decorators/public.decorator';
import { SkipTosCheck } from '../decorators/skip-tos-check.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import type { UserPayload } from '../interfaces/auth-request.interface';

@SdkExport({
  tag: 'auth',
  description: 'Authentication - signup, login, tokens',
  requiresAuth: false,
})
@ApiTags('auth')
@Controller('v1/auth')
export class AuthCoreController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @Throttle({
    default: {
      ttl: RATE_LIMIT_CONFIG.TTL_MS,
      limit: RATE_LIMIT_CONFIG.AUTH_MAX_REQUESTS,
    },
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async signup(@Body(createZodPipe(RegisterCredentialsSchema)) dto: RegisterCredentials) {
    return this.authService.signup(dto);
  }

  @Public()
  @Post('login')
  @Throttle({
    default: {
      ttl: RATE_LIMIT_CONFIG.TTL_MS,
      limit: RATE_LIMIT_CONFIG.AUTH_MAX_REQUESTS,
    },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body(createZodPipe(LoginCredentialsSchema)) dto: LoginCredentials) {
    return this.authService.login(dto);
  }

  @Public()
  @SkipThrottle()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh JWT token using refresh token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body(createZodPipe(RefreshTokenSchema)) dto: RefreshToken) {
    return this.authService.refreshTokenWithToken(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @SkipTosCheck() // Allow users to view their own info without ToS acceptance
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current authenticated user info' })
  @ApiResponse({ status: 200, type: CurrentUserResponseDto })
  @ApiResponse({ status: 200, description: 'User info retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@CurrentUser() user: UserPayload) {
    return this.authService.getCurrentUser(user.userId);
  }
}
