import { Controller, HttpCode, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeController,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import {
  QR_CODE_SERVICE_PORT,
  type QrCodeServicePort,
} from '../../ports/outbound/qrcode-service.port';
import { TOTP_SERVICE_PORT, type TotpServicePort } from '../../ports/outbound/totp-service.port';
import {
  TWO_FACTOR_REPOSITORY_PORT,
  type TwoFactorRepositoryPort,
} from '../../ports/outbound/two-factor-repository.port';
import { Setup2faResponseDto } from './setup-2fa.dto';
import { Setup2faUseCase } from './setup-2fa.use-case';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@ApiTags('Two-Factor Auth')
@ApiExcludeController()
@ApiBearerAuth()
@Controller('auth/2fa')
export class Setup2faController {
  private readonly useCase: Setup2faUseCase;

  constructor(
    @Inject(TWO_FACTOR_REPOSITORY_PORT)
    repository: TwoFactorRepositoryPort,
    @Inject(TOTP_SERVICE_PORT)
    totpService: TotpServicePort,
    @Inject(QR_CODE_SERVICE_PORT)
    qrCodeService: QrCodeServicePort,
  ) {
    this.useCase = new Setup2faUseCase(repository, totpService, qrCodeService);
  }

  @Post('setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Setup 2FA',
    description: 'Generates TOTP secret and QR code. 2FA is not enabled until verified.',
  })
  @ApiOkResponse({
    description: '2FA setup data',
    type: Setup2faResponseDto,
  })
  async setup(@Req() req: AuthenticatedRequest): Promise<Setup2faResponseDto> {
    return this.useCase.execute(req.user.id);
  }
}
