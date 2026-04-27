import { Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { TwoFactorAuthUseCases } from '../../application/ports/two-factor-auth.port';
import { RegenerateBackupCodesResponseDto } from '../../application/use-cases/regenerate-backup-codes/regenerate-backup-codes.dto';

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
export class RegenerateBackupCodesController {
  constructor(private readonly bc: TwoFactorAuthUseCases) {}

  @Post('backup-codes/regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Regenerate backup codes',
    description: 'Generates new backup codes, replacing existing ones. Shown only once.',
  })
  @ApiDataResponse(RegenerateBackupCodesResponseDto, { description: 'New backup codes' })
  async regenerate(
    @Req() req: AuthenticatedRequest,
  ): Promise<DataResponse<RegenerateBackupCodesResponseDto>> {
    const result = await this.bc.regenerateBackupCodes.execute(req.user.id);
    return { success: true, data: result };
  }
}
