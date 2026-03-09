import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { LoginPort } from '../../ports/inbound';
import { LOGIN_PORT } from '../../ports/inbound';
import { LoginDto, LoginResponseDto } from './login.dto';

@SdkExport({ tag: 'auth', description: 'User authentication - login' })
@ApiTags('Authentication')
@Controller('auth')
export class LoginController {
  constructor(
    @Inject(LOGIN_PORT)
    private readonly loginService: LoginPort,
  ) {}

  @Post('login')
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
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<DataResponse<LoginResponseDto>> {
    const result = await this.loginService.execute({
      email: dto.email,
      password: dto.password,
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
