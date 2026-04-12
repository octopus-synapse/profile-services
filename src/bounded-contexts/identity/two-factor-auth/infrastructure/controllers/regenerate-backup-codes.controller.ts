import { Controller, HttpCode, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { REGENERATE_BACKUP_CODES_PORT } from '../../application/ports';
import { RegenerateBackupCodesResponseDto } from '../../application/use-cases/regenerate-backup-codes/regenerate-backup-codes.dto';
import type { RegenerateBackupCodesUseCase } from '../../application/use-cases/regenerate-backup-codes/regenerate-backup-codes.use-case';

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
  constructor(
    @Inject(REGENERATE_BACKUP_CODES_PORT)
    private readonly useCase: RegenerateBackupCodesUseCase,
  ) {}

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
    const result = await this.useCase.execute(req.user.id);
    return { success: true, data: result };
  }
}
