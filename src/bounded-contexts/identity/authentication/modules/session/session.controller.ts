/**
 * Session Controller
 *
 * Handles cookie-based session validation.
 * GET /auth/session - Returns current user if authenticated via cookie.
 */

import { Controller, Get, HttpCode, HttpStatus, Inject, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { ValidateSessionPort } from '../../ports/inbound';
import { VALIDATE_SESSION_PORT } from '../../ports/inbound';
import type { CookieReader } from '../../ports/outbound/session-storage.port';
import { SessionResponseDto } from './session.dto';

/**
 * Creates a CookieReader adapter from Express Request
 * Bridges infrastructure (Express) to domain abstraction
 */
function createCookieReader(req: Request): CookieReader {
  return {
    getCookie: (name: string) => req.cookies?.[name],
  };
}

@SdkExport({ tag: 'auth', description: 'Session validation' })
@ApiTags('auth')
@Controller('auth')
export class SessionController {
  constructor(
    @Inject(VALIDATE_SESSION_PORT)
    private readonly validateSessionService: ValidateSessionPort,
  ) {}

  @Get('session')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'auth_session',
    summary: 'Get Session',
    description: 'Validates session cookie and returns current user data if authenticated.',
  })
  @ApiDataResponse(SessionResponseDto, {
    description: 'Session status',
  })
  async getSession(@Req() req: Request): Promise<DataResponse<SessionResponseDto>> {
    const result = await this.validateSessionService.execute({
      cookieReader: createCookieReader(req),
    });

    return {
      success: true,
      data: {
        authenticated: result.success,
        user: result.user,
      },
    };
  }
}
