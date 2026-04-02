import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure/guards/jwt-auth.guard';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { LogoutPort, TerminateSessionPort } from '../../application/ports';
import { LOGOUT_PORT, TERMINATE_SESSION_PORT } from '../../application/ports';
import { LogoutDto, LogoutResponseDto } from '../../application/use-cases/logout/logout.dto';
import type {
  CookieReader,
  CookieWriter,
  SessionCookieOptions,
} from '../../domain/ports/session-storage.port';

interface AuthenticatedUser {
  id: string;
}

/**
 * Creates a CookieReader adapter from Express Request
 */
function createCookieReader(req: Request): CookieReader {
  return {
    getCookie: (name: string) => req.cookies?.[name],
  };
}

/**
 * Creates a CookieWriter adapter from Express Response
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

@SdkExport({ tag: 'auth', description: 'User authentication - logout' })
@ApiTags('auth')
@Controller('auth')
export class LogoutController {
  constructor(
    @Inject(LOGOUT_PORT)
    private readonly logoutService: LogoutPort,
    @Inject(TERMINATE_SESSION_PORT)
    private readonly terminateSessionService: TerminateSessionPort,
  ) {}

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'auth_logout',
    summary: 'Logout',
    description: 'Logs out the user by invalidating refresh token(s) and clearing session cookie.',
  })
  @ApiDataResponse(LogoutResponseDto, {
    description: 'Logout successful',
  })
  async logout(
    @Body() dto: LogoutDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DataResponse<LogoutResponseDto>> {
    // Invalidate refresh tokens
    await this.logoutService.execute({
      userId: user.id,
      refreshToken: dto.refreshToken,
      logoutAllSessions: dto.logoutAllSessions,
    });

    // Clear session cookie
    await this.terminateSessionService.execute({
      cookieReader: createCookieReader(req),
      cookieWriter: createCookieWriter(res),
      terminateAllSessions: dto.logoutAllSessions,
    });

    const message = dto.logoutAllSessions
      ? 'Logged out from all sessions.'
      : 'Logged out successfully.';

    return {
      success: true,
      data: {
        message,
      },
    };
  }
}
