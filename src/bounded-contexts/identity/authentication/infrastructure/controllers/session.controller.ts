/**
 * Session Controller
 *
 * Handles cookie-based session validation.
 * GET /auth/session - Returns current user if authenticated via cookie.
 * GET /auth/sessions - Lists all active sessions (refresh tokens) for the user.
 * DELETE /auth/sessions/:id - Revokes a specific session by token id.
 */

import { Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import type { ValidateSessionPort } from '../../application/ports';
import { VALIDATE_SESSION_PORT } from '../../application/ports';
import { SessionResponseDto } from '../../application/use-cases/session/session.dto';
import type { CookieReader } from '../../domain/ports/session-storage.port';
import { SessionDeviceService, type SessionDeviceView } from '../adapters/session-device.service';

interface RequestWithUser extends Request {
  user: { userId: string; email: string };
}

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
    private readonly sessionDevices: SessionDeviceService,
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

  @Get('sessions')
  @RequirePermission(Permission.RESUME_READ)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'auth_listSessions',
    summary: 'List active sessions (devices) for the current user.',
  })
  async listSessions(
    @Req() req: RequestWithUser,
  ): Promise<DataResponse<{ sessions: SessionDeviceView[] }>> {
    const sessions = await this.sessionDevices.listActiveForUser(req.user.userId);
    return { success: true, data: { sessions } };
  }

  @Delete('sessions/:id')
  @RequirePermission(Permission.RESUME_READ)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'auth_revokeSession',
    summary: 'Revoke a specific session (device) by refresh-token id.',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async revokeSession(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<DataResponse<{ revoked: true }>> {
    await this.sessionDevices.revokeForUser(req.user.userId, id);
    return { success: true, data: { revoked: true } };
  }
}
