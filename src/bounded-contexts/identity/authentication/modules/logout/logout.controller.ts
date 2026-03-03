import { Body, Controller, HttpCode, HttpStatus, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure/guards/jwt-auth.guard';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { LogoutPort } from '../../ports/inbound';
import { LOGOUT_PORT } from '../../ports/inbound';
import { LogoutDto, LogoutResponseDto } from './logout.dto';

interface AuthenticatedUser {
  id: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class LogoutController {
  constructor(
    @Inject(LOGOUT_PORT)
    private readonly logout: LogoutPort,
  ) {}

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout',
    description: 'Logs out the user by invalidating refresh token(s).',
  })
  @ApiDataResponse(LogoutResponseDto, {
    description: 'Logout successful',
  })
  async handle(
    @Body() dto: LogoutDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DataResponse<LogoutResponseDto>> {
    await this.logout.execute({
      userId: user.id,
      refreshToken: dto.refreshToken,
      logoutAllSessions: dto.logoutAllSessions,
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
