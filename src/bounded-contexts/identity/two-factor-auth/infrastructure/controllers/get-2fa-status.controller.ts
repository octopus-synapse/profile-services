import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { TwoFactorAuthUseCases } from '../../application/ports/two-factor-auth.port';
import { Get2faStatusResponseDto } from '../../application/use-cases/get-2fa-status/get-2fa-status.dto';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@SdkExport({
  tag: 'two-factor-auth',
  description: 'Two-Factor Authentication API',
  requiresAuth: true,
})
@ApiTags('Two-Factor Auth')
@ApiBearerAuth()
@Controller('auth/2fa')
export class Get2faStatusController {
  constructor(private readonly bc: TwoFactorAuthUseCases) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get 2FA status',
    description: 'Returns 2FA status including enabled state and backup codes remaining.',
  })
  @ApiDataResponse(Get2faStatusResponseDto, { description: '2FA status' })
  async getStatus(
    @Req() req: AuthenticatedRequest,
  ): Promise<DataResponse<Get2faStatusResponseDto>> {
    const result = await this.bc.get2faStatus.execute(req.user.id);
    return {
      success: true,
      data: { ...result, lastUsedAt: result.lastUsedAt?.toISOString() ?? null },
    };
  }
}
