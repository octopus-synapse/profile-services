/**
 * Get Consent History Controller
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
import { ConsentHistoryResponseDto } from '../../application/use-cases/get-consent-history/get-consent-history.dto';
import { GetConsentHistoryUseCasePort } from '../../application/use-cases/tokens';
import { toConsentHistoryResponse } from '../presenters/get-consent-history.presenter';

interface RequestWithUser extends Request {
  user: { userId: string; email: string };
}

@ApiTags('User Consent')
@Controller('v1/users/me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GetConsentHistoryController {
  constructor(private readonly getConsentHistoryUseCase: GetConsentHistoryUseCasePort) {}

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
    const result = await this.getConsentHistoryUseCase.execute({ userId: req.user.userId });

    return { success: true, data: toConsentHistoryResponse(result) };
  }
}
