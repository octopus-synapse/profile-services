import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { HASH_SERVICE_PORT, type HashServicePort } from '../../ports/outbound/hash-service.port';
import { TOTP_SERVICE_PORT, type TotpServicePort } from '../../ports/outbound/totp-service.port';
import {
  TWO_FACTOR_REPOSITORY_PORT,
  type TwoFactorRepositoryPort,
} from '../../ports/outbound/two-factor-repository.port';
import {
  VerifyAndEnable2faRequestDto,
  VerifyAndEnable2faResponseDto,
} from './verify-and-enable-2fa.dto';
import { VerifyAndEnable2faUseCase } from './verify-and-enable-2fa.use-case';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@ApiTags('Two-Factor Auth')
@ApiBearerAuth()
@Controller('auth/2fa')
export class VerifyAndEnable2faController {
  private readonly useCase: VerifyAndEnable2faUseCase;

  constructor(
    @Inject(TWO_FACTOR_REPOSITORY_PORT)
    repository: TwoFactorRepositoryPort,
    @Inject(TOTP_SERVICE_PORT)
    totpService: TotpServicePort,
    @Inject(HASH_SERVICE_PORT)
    hashService: HashServicePort,
  ) {
    this.useCase = new VerifyAndEnable2faUseCase(repository, totpService, hashService);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify token and enable 2FA',
    description: 'Verifies TOTP token and enables 2FA. Returns backup codes (shown only once).',
  })
  @ApiOkResponse({
    description: '2FA enabled with backup codes',
    type: VerifyAndEnable2faResponseDto,
  })
  async verify(
    @Req() req: AuthenticatedRequest,
    @Body() dto: VerifyAndEnable2faRequestDto,
  ): Promise<VerifyAndEnable2faResponseDto> {
    return this.useCase.execute(req.user.id, dto.token);
  }
}
