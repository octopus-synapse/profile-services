/**
 * Auth Core Controller
 * Handles signup, login, token refresh, and current user info
 */

import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { AuthService } from '@/bounded-contexts/identity/auth/auth.service';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import {
  type LoginCredentials,
  LoginCredentialsDto,
  LoginCredentialsSchema,
  RATE_LIMIT_CONFIG,
  type RefreshToken,
  RefreshTokenDto,
  RefreshTokenSchema,
  type RegisterCredentials,
  RegisterCredentialsDto,
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
  @ApiBody({ type: RegisterCredentialsDto })
  @ApiDataResponse(AuthResponseDto, {
    description: 'User successfully registered',
    status: HttpStatus.CREATED,
  })
  async signup(
    @Body(createZodPipe(RegisterCredentialsSchema)) dto: RegisterCredentials,
  ): Promise<DataResponse<AuthResponseDto>> {
    const result = await this.authService.signup(dto);
    return { success: true, data: result as unknown as AuthResponseDto };
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
  @ApiBody({ type: LoginCredentialsDto })
  @ApiDataResponse(AuthResponseDto, { description: 'Login successful' })
  async login(
    @Body(createZodPipe(LoginCredentialsSchema)) dto: LoginCredentials,
  ): Promise<DataResponse<AuthResponseDto>> {
    const result = await this.authService.login(dto);
    return { success: true, data: result as unknown as AuthResponseDto };
  }

  @Public()
  @SkipThrottle()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh JWT token using refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiDataResponse(AuthResponseDto, {
    description: 'Token refreshed successfully',
  })
  async refreshToken(
    @Body(createZodPipe(RefreshTokenSchema)) dto: RefreshToken,
  ): Promise<DataResponse<AuthResponseDto>> {
    const result = await this.authService.refreshTokenWithToken(dto.refreshToken);
    return { success: true, data: result as unknown as AuthResponseDto };
  }

  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @SkipTosCheck() // Allow users to view their own info without ToS acceptance
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current authenticated user info' })
  @ApiDataResponse(CurrentUserResponseDto, {
    description: 'User info retrieved successfully',
  })
  async getCurrentUser(
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<CurrentUserResponseDto>> {
    const result = await this.authService.getCurrentUser(user.userId);
    return { success: true, data: result as unknown as CurrentUserResponseDto };
  }
}
