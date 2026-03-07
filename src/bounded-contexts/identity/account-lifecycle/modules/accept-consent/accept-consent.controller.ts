/**
 * Accept Consent Controller
 *
 * HTTP adapter for the Accept Consent use-case.
 * Handles user consent acceptance with audit trail.
 */

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import { type AcceptConsent, AcceptConsentResponseDto, AcceptConsentSchema } from '@/shared-kernel';
import { AcceptConsentRequestDto } from '@/shared-kernel/dtos/sdk-request.dto';
import {
  AllowUnverifiedEmail,
  JwtAuthGuard,
  SkipTosCheck,
} from '../../../shared-kernel/infrastructure';
import { AcceptConsentUseCase } from './accept-consent.use-case';

interface RequestWithUser extends Request {
  user: { userId: string; email: string };
}

export const ACCEPT_CONSENT_USE_CASE = Symbol('AcceptConsentUseCase');

@SdkExport({ tag: 'user-consent', description: 'User Consent API' })
@ApiTags('User Consent')
@Controller('v1/users/me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AcceptConsentController {
  constructor(
    @Inject(ACCEPT_CONSENT_USE_CASE)
    private readonly acceptConsentUseCase: AcceptConsentUseCase,
  ) {}

  @Post('accept-consent')
  @HttpCode(HttpStatus.CREATED)
  @SkipTosCheck()
  @AllowUnverifiedEmail()
  @ApiOperation({
    summary: 'Accept Terms of Service or Privacy Policy',
    description:
      'Records user acceptance of legal documents with IP and user agent for audit trail. ' +
      'Required before accessing protected API endpoints.',
  })
  @ApiBody({ type: AcceptConsentRequestDto })
  @ApiDataResponse(AcceptConsentResponseDto, {
    description: 'Consent recorded successfully',
    status: HttpStatus.CREATED,
  })
  async acceptConsent(
    @Req() req: RequestWithUser,
    @Body(createZodPipe(AcceptConsentSchema)) dto: AcceptConsent,
  ): Promise<DataResponse<AcceptConsentResponseDto>> {
    const userId = req.user.userId;
    const ipAddress = dto.ipAddress ?? req.ip ?? '';
    const userAgent = dto.userAgent ?? req.headers['user-agent'] ?? '';

    const consent = await this.acceptConsentUseCase.execute({
      userId,
      documentType: dto.documentType,
      ipAddress,
      userAgent,
    });

    const documentName =
      dto.documentType === 'TERMS_OF_SERVICE'
        ? 'Terms of Service'
        : dto.documentType === 'PRIVACY_POLICY'
          ? 'Privacy Policy'
          : 'Marketing Consent';

    return {
      success: true,
      data: {
        message: `${documentName} accepted successfully`,
        consent: {
          id: consent.id,
          userId: consent.userId,
          documentType: consent.documentType,
          version: consent.version,
          acceptedAt: consent.acceptedAt.toISOString(),
          ipAddress,
          userAgent,
        },
      },
    };
  }
}
