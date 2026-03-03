import { Controller, Get, Inject, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  TWO_FACTOR_REPOSITORY_PORT,
  type TwoFactorRepositoryPort,
} from '../../ports/outbound/two-factor-repository.port';
import { Get2faStatusResponseDto } from './get-2fa-status.dto';
import { Get2faStatusUseCase } from './get-2fa-status.use-case';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@ApiTags('Two-Factor Auth')
@ApiBearerAuth()
@Controller('auth/2fa')
export class Get2faStatusController {
  private readonly useCase: Get2faStatusUseCase;

  constructor(
    @Inject(TWO_FACTOR_REPOSITORY_PORT)
    repository: TwoFactorRepositoryPort,
  ) {
    this.useCase = new Get2faStatusUseCase(repository);
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get 2FA status',
    description: 'Returns 2FA status including enabled state and backup codes remaining.',
  })
  @ApiOkResponse({
    description: '2FA status',
    type: Get2faStatusResponseDto,
  })
  async getStatus(@Req() req: AuthenticatedRequest): Promise<Get2faStatusResponseDto> {
    return this.useCase.execute(req.user.id);
  }
}
