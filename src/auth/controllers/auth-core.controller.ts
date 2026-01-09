/**
 * Auth Core Controller
 * Handles signup, login, token refresh, and current user info
 */

import {
  Controller,
  Post,
  Get,
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
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from '../auth.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
} from '../schemas/auth.schemas';
import type {
  SignupDto,
  LoginDto,
  RefreshTokenDto,
} from '../schemas/auth.schemas';
import { Public } from '../decorators/public.decorator';
import { SkipTosCheck } from '../decorators/skip-tos-check.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../interfaces/auth-request.interface';
import { APP_CONSTANTS } from '../../common/constants/config';

@ApiTags('auth')
@Controller('v1/auth')
export class AuthCoreController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @Throttle({
    default: { ttl: 60000, limit: APP_CONSTANTS.AUTH_RATE_LIMIT_MAX_REQUESTS },
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async signup(
    @Body(new ZodValidationPipe(signupSchema)) signupDto: SignupDto,
  ) {
    return this.authService.signup(signupDto);
  }

  @Public()
  @Post('login')
  @Throttle({
    default: { ttl: 60000, limit: APP_CONSTANTS.AUTH_RATE_LIMIT_MAX_REQUESTS },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body(new ZodValidationPipe(loginSchema)) loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @SkipThrottle()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh JWT token using refresh token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(
    @Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenDto,
  ) {
    return this.authService.refreshTokenWithToken(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @SkipTosCheck() // Allow users to view their own info without ToS acceptance
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current authenticated user info' })
  @ApiResponse({ status: 200, description: 'User info retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@CurrentUser() user: UserPayload) {
    return this.authService.getCurrentUser(user.userId);
  }
}
