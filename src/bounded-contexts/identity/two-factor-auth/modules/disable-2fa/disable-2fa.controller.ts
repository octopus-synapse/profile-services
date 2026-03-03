import { Controller, Delete, HttpCode, HttpStatus, Inject, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiEmptyDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import {
  TWO_FACTOR_REPOSITORY_PORT,
  type TwoFactorRepositoryPort,
} from '../../ports/outbound/two-factor-repository.port';
import { Disable2faUseCase } from './disable-2fa.use-case';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

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
