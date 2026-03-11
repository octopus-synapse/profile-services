import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { CreateSessionPort, LoginPort } from '../../ports/inbound';
import { CREATE_SESSION_PORT, LOGIN_PORT } from '../../ports/inbound';
import type { CookieWriter, SessionCookieOptions } from '../../ports/outbound/session-storage.port';
import { LoginDto, LoginResponseDto } from './login.dto';

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
@ApiTags('Authentication')
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
    description: 'Authenticates user with email and password.',
  })
  @ApiDataResponse(LoginResponseDto, {
    description: 'Login successful',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
  })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DataResponse<LoginResponseDto>> {
    const result = await this.loginService.execute({
      email: dto.email,
      password: dto.password,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

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
}
