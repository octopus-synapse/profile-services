import { Controller, Delete, HttpCode, HttpStatus, Inject, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiEmptyDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Disable2faUseCase } from '../../application/use-cases/disable-2fa/disable-2fa.use-case';
import {
  TWO_FACTOR_REPOSITORY_PORT,
  type TwoFactorRepositoryPort,
} from '../../domain/ports/two-factor.repository.port';

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
  private readonly useCase: Disable2faUseCase;

  constructor(
    @Inject(TWO_FACTOR_REPOSITORY_PORT)
    repository: TwoFactorRepositoryPort,
  ) {
    this.useCase = new Disable2faUseCase(repository);
  }

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
