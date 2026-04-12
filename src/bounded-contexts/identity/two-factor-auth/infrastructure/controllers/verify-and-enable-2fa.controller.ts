import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { VERIFY_AND_ENABLE_2FA_PORT } from '../../application/ports';
import {
  VerifyAndEnable2faRequestDto,
  VerifyAndEnable2faResponseDto,
} from '../../application/use-cases/verify-and-enable-2fa/verify-and-enable-2fa.dto';
import type { VerifyAndEnable2faUseCase } from '../../application/use-cases/verify-and-enable-2fa/verify-and-enable-2fa.use-case';

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
export class VerifyAndEnable2faController {
  constructor(
    @Inject(VERIFY_AND_ENABLE_2FA_PORT)
    private readonly useCase: VerifyAndEnable2faUseCase,
  ) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify token and enable 2FA',
    description: 'Verifies TOTP token and enables 2FA. Returns backup codes (shown only once).',
  })
  @ApiDataResponse(VerifyAndEnable2faResponseDto, { description: '2FA enabled with backup codes' })
  async verify(
    @Req() req: AuthenticatedRequest,
    @Body() dto: VerifyAndEnable2faRequestDto,
  ): Promise<DataResponse<VerifyAndEnable2faResponseDto>> {
    const result = await this.useCase.execute(req.user.id, dto.code);
    return { success: true, data: result };
  }
}
