import { Controller, HttpCode, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { SETUP_2FA_PORT } from '../../application/ports';
import { Setup2faResponseDto } from '../../application/use-cases/setup-2fa/setup-2fa.dto';
import type { Setup2faUseCase } from '../../application/use-cases/setup-2fa/setup-2fa.use-case';

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
export class Setup2faController {
  constructor(
    @Inject(SETUP_2FA_PORT)
    private readonly useCase: Setup2faUseCase,
  ) {}

  @Post('setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Setup 2FA',
    description: 'Generates TOTP secret and QR code. 2FA is not enabled until verified.',
  })
  @ApiDataResponse(Setup2faResponseDto, { description: '2FA setup data' })
  async setup(@Req() req: AuthenticatedRequest): Promise<DataResponse<Setup2faResponseDto>> {
    const result = await this.useCase.execute(req.user.id);
    return { success: true, data: result };
  }
}
