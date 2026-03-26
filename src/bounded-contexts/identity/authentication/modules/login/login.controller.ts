import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import type { CreateSessionPort, LoginPort } from '../../ports/inbound';
import { CREATE_SESSION_PORT, LOGIN_PORT } from '../../ports/inbound';
import type { CookieWriter, SessionCookieOptions } from '../../ports/outbound/session-storage.port';
import {
  LoginDto,
  LoginResponseDto,
  LoginSchema,
  LoginVerify2faDto,
  LoginVerify2faSchema,
} from './login.dto';

/**
 * Creates a CookieWriter adapter from Express Response
 * Bridges infrastructure (Express) to domain abstraction
 */
function createCookieWriter(res: Response): CookieWriter {
  return {
    setCookie: (name: string, value: string, options: SessionCookieOptions) => {
      res.cookie(name, value, {
        ...options,
        expires: new Date(Date.now() + options.maxAge),
      });
    },
    clearCookie: (name: string, options: Partial<SessionCookieOptions>) => {
      res.clearCookie(name, options);
    },
  };
}

@SdkExport({ tag: 'auth', description: 'User authentication - login' })
@ApiTags('auth')
@Controller('auth')
export class LoginController {
  constructor(
    @Inject(LOGIN_PORT)
    private readonly loginService: LoginPort,
    @Inject(CREATE_SESSION_PORT)
    private readonly createSessionService: CreateSessionPort,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'auth_login',
    summary: 'Login',
    description:
      'Authenticates user with email and password. Returns twoFactorRequired when 2FA is enabled.',
  })
  @ApiDataResponse(LoginResponseDto, {
    description: 'Login successful or 2FA challenge required',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
  })
  async login(
    @Body(createZodPipe(LoginSchema)) dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DataResponse<LoginResponseDto>> {
    const result = await this.loginService.execute({
      email: dto.email,
      password: dto.password,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // 2FA required — do not issue session cookie
    if (result.twoFactorRequired) {
      return {
        success: true,
        data: {
          userId: result.userId,
          twoFactorRequired: true,
        },
      };
    }

    // Set session cookie for cookie-based auth
    await this.createSessionService.execute({
      userId: result.userId,
      email: dto.email,
      cookieWriter: createCookieWriter(res),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        userId: result.userId,
      },
    };
  }

  @Post('login/verify-2fa')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'auth_login_verify2fa',
    summary: 'Verify 2FA code during login',
    description: 'Completes login by validating a TOTP or backup code.',
  })
  @ApiDataResponse(LoginResponseDto, {
    description: 'Login completed after 2FA verification',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid 2FA code',
  })
  async verifyLogin2fa(
    @Body(createZodPipe(LoginVerify2faSchema)) dto: LoginVerify2faDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DataResponse<LoginResponseDto>> {
    const result = await this.loginService.completeWithTwoFactor({
      userId: dto.userId,
      code: dto.code,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Fetch email for session creation
    await this.createSessionService.execute({
      userId: result.userId,
      email: result.email ?? '',
      cookieWriter: createCookieWriter(res),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        userId: result.userId,
      },
    };
  }
}
