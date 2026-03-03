import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { RefreshTokenPort } from '../../ports/inbound';
import { REFRESH_TOKEN_PORT } from '../../ports/inbound';
import { RefreshTokenDto, RefreshTokenResponseDto } from './refresh-token.dto';

@ApiTags('Authentication')
@Controller('auth')
export class RefreshTokenController {
  constructor(
    @Inject(REFRESH_TOKEN_PORT)
    private readonly refreshToken: RefreshTokenPort,
  ) {}

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Issues new access and refresh tokens using a valid refresh token.',
  })
  @ApiDataResponse(RefreshTokenResponseDto, {
    description: 'Tokens refreshed successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
  })
  async handle(@Body() dto: RefreshTokenDto): Promise<DataResponse<RefreshTokenResponseDto>> {
    const result = await this.refreshToken.execute({
      refreshToken: dto.refreshToken,
    });

    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      },
    };
  }
}
