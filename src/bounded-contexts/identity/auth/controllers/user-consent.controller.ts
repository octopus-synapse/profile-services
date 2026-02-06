import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { Request } from 'express';
import { TosAcceptanceService } from '../services/tos-acceptance.service';
import { AuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { SkipTosCheck } from '../decorators/skip-tos-check.decorator';
import { AllowUnverifiedEmail } from '../decorators/allow-unverified-email.decorator';
import { AcceptConsentSchema, type AcceptConsent } from '@/shared-kernel';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import { AuditAction } from '@prisma/client';

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
  @ApiResponse({
    status: 201,
    description: 'Consent recorded successfully',
    schema: {
      example: {
        message: 'Terms of Service accepted successfully',
        consent: {
          id: 'consent-123',
          userId: 'user-456',
          documentType: 'TERMS_OF_SERVICE',
          version: '1.0.0',
          acceptedAt: '2026-01-09T19:15:00.000Z',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async acceptConsent(
    @Req() req: RequestWithUser,
    @Body(createZodPipe(AcceptConsentSchema)) dto: AcceptConsent,
  ) {
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

    await this.auditService.log(
      userId,
      auditAction,
      'UserConsent',
      consent.id,
      undefined,
      req,
    );

    // Return user-friendly message
    const documentName =
      dto.documentType === 'TERMS_OF_SERVICE'
        ? 'Terms of Service'
        : dto.documentType === 'PRIVACY_POLICY'
          ? 'Privacy Policy'
          : 'Marketing Consent';

    return {
      message: `${documentName} accepted successfully`,
      consent,
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
  @ApiResponse({
    status: 200,
    description: 'Consent history retrieved successfully',
    schema: {
      example: [
        {
          id: 'consent-1',
          documentType: 'TERMS_OF_SERVICE',
          version: '1.0.0',
          acceptedAt: '2026-01-09T10:00:00.000Z',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
        },
        {
          id: 'consent-2',
          documentType: 'PRIVACY_POLICY',
          version: '1.0.0',
          acceptedAt: '2026-01-09T10:00:05.000Z',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
        },
      ],
    },
  })
  async getConsentHistory(@Req() req: RequestWithUser) {
    const userId = req.user.userId;
    return this.tosService.getAcceptanceHistory(userId);
  }

  @Get('consent-status')
  @HttpCode(HttpStatus.OK)
  @SkipTosCheck() // Allow checking status without ToS acceptance
  @AllowUnverifiedEmail() // Allow access before email verification
  @ApiOperation({
    summary: 'Check consent acceptance status',
    description:
      'Returns which documents the user has accepted for the current versions',
  })
  @ApiResponse({
    status: 200,
    description: 'Consent status retrieved successfully',
    schema: {
      example: {
        tosAccepted: true,
        privacyPolicyAccepted: true,
        marketingConsentAccepted: false,
        latestTosVersion: '1.0.0',
        latestPrivacyPolicyVersion: '1.0.0',
      },
    },
  })
  async checkConsentStatus(@Req() req: RequestWithUser) {
    const userId = req.user.userId;

    const [tosAccepted, privacyPolicyAccepted, marketingConsentAccepted] =
      await Promise.all([
        this.tosService.hasAcceptedCurrentVersion(userId, 'TERMS_OF_SERVICE'),
        this.tosService.hasAcceptedCurrentVersion(userId, 'PRIVACY_POLICY'),
        this.tosService.hasAcceptedCurrentVersion(userId, 'MARKETING_CONSENT'),
      ]);

    // Get current versions from environment
    const latestTosVersion = process.env.TOS_VERSION ?? '1.0.0';
    const latestPrivacyPolicyVersion =
      process.env.PRIVACY_POLICY_VERSION ?? '1.0.0';

    return {
      tosAccepted,
      privacyPolicyAccepted,
      marketingConsentAccepted,
      latestTosVersion,
      latestPrivacyPolicyVersion,
    };
  }
}
