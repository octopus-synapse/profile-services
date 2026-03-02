import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditAction } from '@prisma/client';
import type { Request } from 'express';
import { AuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.service';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import {
  type AcceptConsent,
  AcceptConsentResponseDto,
  AcceptConsentSchema,
  ConsentHistoryResponseDto,
  ConsentStatusResponseDto,
} from '@/shared-kernel';
import { AllowUnverifiedEmail } from '../decorators/allow-unverified-email.decorator';
import { SkipTosCheck } from '../decorators/skip-tos-check.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TosAcceptanceService } from '../services/tos-acceptance.service';

interface RequestWithUser extends Request {
  user: { userId: string; email: string };
}

@SdkExport({ tag: 'user-consent', description: 'User Consent API' })
@ApiTags('User Consent')
@Controller('v1/users/me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserConsentController {
  constructor(
    private readonly tosService: TosAcceptanceService,
    private readonly auditService: AuditLogService,
  ) {}

  @Post('accept-consent')
  @HttpCode(HttpStatus.CREATED)
  @SkipTosCheck() // Allow access to accept ToS without having accepted it
  @AllowUnverifiedEmail() // Allow access before email verification
  @ApiOperation({
    summary: 'Accept Terms of Service or Privacy Policy',
    description:
      'Records user acceptance of legal documents with IP and user agent for audit trail. ' +
      'Required before accessing protected API endpoints.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['documentType'],
      properties: {
        documentType: {
          type: 'string',
          enum: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'MARKETING_CONSENT'],
        },
        ipAddress: { type: 'string' },
        userAgent: { type: 'string' },
      },
    },
  })
  @ApiDataResponse(AcceptConsentResponseDto, {
    description: 'Consent recorded successfully',
    status: HttpStatus.CREATED,
  })
  async acceptConsent(
    @Req() req: RequestWithUser,
    @Body(createZodPipe(AcceptConsentSchema)) dto: AcceptConsent,
  ): Promise<DataResponse<AcceptConsentResponseDto>> {
    const userId = req.user.userId;

    // Extract IP and user agent from request if not provided in DTO
    const ipAddress = dto.ipAddress ?? req.ip ?? '';
    const userAgent = dto.userAgent ?? req.headers['user-agent'] ?? '';

    // Record acceptance
    const consent = await this.tosService.recordAcceptance(userId, {
      documentType: dto.documentType,
      ipAddress,
      userAgent,
    });

    // Log to audit trail
    const auditAction: AuditAction =
      dto.documentType === 'TERMS_OF_SERVICE'
        ? AuditAction.TOS_ACCEPTED
        : dto.documentType === 'PRIVACY_POLICY'
          ? AuditAction.PRIVACY_POLICY_ACCEPTED
          : AuditAction.TOS_ACCEPTED; // Fallback for MARKETING_CONSENT

    await this.auditService.log(userId, auditAction, 'UserConsent', consent.id, undefined, req);

    // Return user-friendly message
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
        consent,
      } as unknown as AcceptConsentResponseDto,
    };
  }

  @Get('consent-history')
  @HttpCode(HttpStatus.OK)
  @SkipTosCheck() // Allow access without ToS acceptance (to view consent history)
  @AllowUnverifiedEmail() // Allow access before email verification
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
    const userId = req.user.userId;
    const result = await this.tosService.getAcceptanceHistory(userId);
    return {
      success: true,
      data: result as unknown as ConsentHistoryResponseDto[],
    };
  }

  @Get('consent-status')
  @HttpCode(HttpStatus.OK)
  @SkipTosCheck() // Allow checking status without ToS acceptance
  @AllowUnverifiedEmail() // Allow access before email verification
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
    const userId = req.user.userId;

    const [tosAccepted, privacyPolicyAccepted, marketingConsentAccepted] = await Promise.all([
      this.tosService.hasAcceptedCurrentVersion(userId, 'TERMS_OF_SERVICE'),
      this.tosService.hasAcceptedCurrentVersion(userId, 'PRIVACY_POLICY'),
      this.tosService.hasAcceptedCurrentVersion(userId, 'MARKETING_CONSENT'),
    ]);

    // Get current versions from environment
    const latestTosVersion = process.env.TOS_VERSION ?? '1.0.0';
    const latestPrivacyPolicyVersion = process.env.PRIVACY_POLICY_VERSION ?? '1.0.0';

    return {
      success: true,
      data: {
        tosAccepted,
        privacyPolicyAccepted,
        marketingConsentAccepted,
        latestTosVersion,
        latestPrivacyPolicyVersion,
      },
    };
  }
}
