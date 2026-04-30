/**
 * Accept Consent Use Case
 *
 * Records user acceptance of legal documents (ToS, Privacy Policy, etc.)
 * with audit trail including IP and user agent.
 */

import { LoggerPort } from '@/shared-kernel';
import type { AuditLoggerPort } from '../../../domain/ports/audit-logger.port';
import { AuditAction } from '../../../domain/ports/audit-logger.port';
import type { AcceptConsentInput, AcceptConsentOutput } from './accept-consent.dto';
import type { ConsentRepositoryPort } from './accept-consent.port';

export abstract class VersionConfigPort {
  abstract getTosVersion(): string;
  abstract getPrivacyPolicyVersion(): string;
  abstract getMarketingConsentVersion(): string;
}

export class AcceptConsentUseCase {
  constructor(
    private readonly consentRepository: ConsentRepositoryPort,
    private readonly versionConfig: VersionConfigPort,
    private readonly auditLogger: AuditLoggerPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: AcceptConsentInput): Promise<AcceptConsentOutput> {
    const version = this.getCurrentVersion(input.documentType);

    const consent = await this.consentRepository.create({
      userId: input.userId,
      documentType: input.documentType,
      version,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    // Log audit action
    const auditAction = this.getAuditAction(input.documentType);
    await this.auditLogger.log(input.userId, auditAction, 'UserConsent', consent.id);

    return {
      id: consent.id,
      userId: consent.userId,
      documentType: consent.documentType,
      version: consent.version,
      acceptedAt: consent.acceptedAt,
    };
  }

  private getCurrentVersion(documentType: string): string {
    switch (documentType) {
      case 'TERMS_OF_SERVICE':
        return this.versionConfig.getTosVersion();
      case 'PRIVACY_POLICY':
        return this.versionConfig.getPrivacyPolicyVersion();
      default:
        return this.versionConfig.getMarketingConsentVersion();
    }
  }

  private getAuditAction(documentType: string): AuditAction {
    switch (documentType) {
      case 'TERMS_OF_SERVICE':
        return AuditAction.TOS_ACCEPTED;
      case 'PRIVACY_POLICY':
        return AuditAction.PRIVACY_POLICY_ACCEPTED;
      default:
        return AuditAction.TOS_ACCEPTED; // Fallback
    }
  }
}
