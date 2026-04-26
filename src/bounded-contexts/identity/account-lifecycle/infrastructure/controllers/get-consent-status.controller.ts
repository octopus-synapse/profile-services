/**
 * Get Consent Status Controller
 */

import { Controller, Get, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import {
  AllowUnverifiedEmail,
  JwtAuthGuard,
  SkipTosCheck,
} from '../../../shared-kernel/infrastructure';
import { ConsentStatusResponseDto } from '../../application/use-cases/get-consent-status/get-consent-status.dto';
import { GetConsentStatusUseCasePort } from '../../application/use-cases/tokens';

interface RequestWithUser extends Request {
  user: { userId: string; email: string };
}

@ApiTags('User Consent')
@Controller('v1/users/me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GetConsentStatusController {
  constructor(private readonly getConsentStatusUseCase: GetConsentStatusUseCasePort) {}

  @Get('consent-status')
  @HttpCode(HttpStatus.OK)
  @SkipTosCheck()
  @AllowUnverifiedEmail()
  @ApiOperation({
    summary: 'Check consent acceptance status',
    description: 'Returns which documents the user has accepted for the current versions',
  })
  @ApiDataResponse(ConsentStatusResponseDto, {
    description: 'Consent status retrieved successfully',
  })
  async checkConsentStatus(
    @Req() req: RequestWithUser,
  ): Promise<DataResponse<ConsentStatusResponseDto>> {
    const result = await this.getConsentStatusUseCase.execute({ userId: req.user.userId });

    return { success: true, data: result };
  }
}
