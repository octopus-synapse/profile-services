/**
 * Get Consent History Controller
 */

import { Controller, Get, HttpCode, HttpStatus, Inject, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import {
  AllowUnverifiedEmail,
  JwtAuthGuard,
  SkipTosCheck,
} from '../../../shared-kernel/infrastructure';
import { ConsentHistoryResponseDto } from '../../application/use-cases/get-consent-history/get-consent-history.dto';
import { GetConsentHistoryUseCase } from '../../application/use-cases/get-consent-history/get-consent-history.use-case';
import { toConsentHistoryResponse } from '../presenters/get-consent-history.presenter';

interface RequestWithUser extends Request {
  user: { userId: string; email: string };
}

export const GET_CONSENT_HISTORY_USE_CASE = Symbol('GetConsentHistoryUseCase');

@ApiTags('User Consent')
@Controller('v1/users/me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GetConsentHistoryController {
  constructor(
    @Inject(GET_CONSENT_HISTORY_USE_CASE)
    private readonly getConsentHistoryUseCase: GetConsentHistoryUseCase,
  ) {}

  @Get('consent-history')
  @HttpCode(HttpStatus.OK)
  @SkipTosCheck()
  @AllowUnverifiedEmail()
  @ApiOperation({
    summary: 'Get consent acceptance history',
    description: 'Retrieves all consent records for the authenticated user',
  })
  @ApiDataResponse(ConsentHistoryResponseDto, {
    description: 'Consent history retrieved successfully',
  })
  async getConsentHistory(
    @Req() req: RequestWithUser,
  ): Promise<DataResponse<ConsentHistoryResponseDto[]>> {
    const result = await this.getConsentHistoryUseCase.execute({
      userId: req.user.userId,
    });

    return { success: true, data: toConsentHistoryResponse(result) };
  }
}
