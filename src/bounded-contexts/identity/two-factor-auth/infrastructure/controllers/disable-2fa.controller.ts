import { Controller, Delete, HttpCode, HttpStatus, Inject, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiEmptyDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { DISABLE_2FA_PORT } from '../../application/ports';
import type { Disable2faUseCase } from '../../application/use-cases/disable-2fa/disable-2fa.use-case';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@SdkExport({
  tag: 'auth',
  description: 'Two-Factor Authentication API',
  requiresAuth: true,
})
@ApiTags('Two-Factor Auth')
@ApiBearerAuth()
@Controller('auth/2fa')
export class Disable2faController {
  constructor(
    @Inject(DISABLE_2FA_PORT)
    private readonly useCase: Disable2faUseCase,
  ) {}

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Disable 2FA',
    description: 'Disables 2FA and removes all backup codes.',
  })
  @ApiEmptyDataResponse({
    status: HttpStatus.NO_CONTENT,
    description: '2FA disabled successfully',
  })
  async disable(@Req() req: AuthenticatedRequest): Promise<void> {
    await this.useCase.execute(req.user.id);
  }
}
