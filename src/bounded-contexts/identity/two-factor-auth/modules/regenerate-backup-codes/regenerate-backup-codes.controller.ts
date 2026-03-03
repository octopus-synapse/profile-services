import { Controller, HttpCode, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { HASH_SERVICE_PORT, type HashServicePort } from '../../ports/outbound/hash-service.port';
import {
  TWO_FACTOR_REPOSITORY_PORT,
  type TwoFactorRepositoryPort,
} from '../../ports/outbound/two-factor-repository.port';
import { RegenerateBackupCodesResponseDto } from './regenerate-backup-codes.dto';
import { RegenerateBackupCodesUseCase } from './regenerate-backup-codes.use-case';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@ApiTags('Two-Factor Auth')
@ApiBearerAuth()
@Controller('auth/2fa')
export class RegenerateBackupCodesController {
  private readonly useCase: RegenerateBackupCodesUseCase;

  constructor(
    @Inject(TWO_FACTOR_REPOSITORY_PORT)
    repository: TwoFactorRepositoryPort,
    @Inject(HASH_SERVICE_PORT)
    hashService: HashServicePort,
  ) {
    this.useCase = new RegenerateBackupCodesUseCase(repository, hashService);
  }

  @Post('backup-codes/regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Regenerate backup codes',
    description: 'Generates new backup codes, replacing existing ones. Shown only once.',
  })
  @ApiOkResponse({
    description: 'New backup codes',
    type: RegenerateBackupCodesResponseDto,
  })
  async regenerate(@Req() req: AuthenticatedRequest): Promise<RegenerateBackupCodesResponseDto> {
    return this.useCase.execute(req.user.id);
  }
}
