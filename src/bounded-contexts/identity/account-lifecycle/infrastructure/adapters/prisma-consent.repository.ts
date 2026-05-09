/**
 * Prisma Consent Repository
 *
 * Adapter implementation of ConsentRepositoryPort using Prisma
 */

import type { ConsentDocumentType } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { ConfigPort } from '@/shared-kernel/config';
import type { ConsentRecord, CreateConsentData } from '../../domain/ports/consent-repository.port';
import { ConsentRepositoryPort } from '../../domain/ports/consent-repository.port';
import { VersionConfigPort } from '../../domain/ports/version-config.port';

export class PrismaConsentRepository implements ConsentRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {}

  async create(data: CreateConsentData): Promise<ConsentRecord> {
    // Idempotent: signup pre-creates consent rows for the current
    // versions of every document, so a subsequent `/accept-consent`
    // call (e.g. user re-confirming) would otherwise blow up on the
    // unique (userId, documentType, version) constraint.
    return this.prisma.userConsent.upsert({
      where: {
        userId_documentType_version: {
          userId: data.userId,
          documentType: data.documentType,
          version: data.version,
        },
      },
      create: {
        userId: data.userId,
        documentType: data.documentType,
        version: data.version,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
      update: {
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  async findByUserAndDocumentType(
    userId: string,
    documentType: ConsentDocumentType,
    version: string,
  ): Promise<ConsentRecord | null> {
    return this.prisma.userConsent.findFirst({
      where: { userId, documentType, version },
    });
  }

  async listByUser(userId: string): Promise<ConsentRecord[]> {
    return this.prisma.userConsent.findMany({
      where: { userId },
      orderBy: { acceptedAt: 'desc' },
    });
  }
}

export class ConfigVersionAdapter implements VersionConfigPort {
  constructor(private readonly config: ConfigPort) {}

  getTosVersion(): string {
    return this.config.getOrDefault<string>('TOS_VERSION', '1.0.0');
  }

  getPrivacyPolicyVersion(): string {
    return this.config.getOrDefault<string>('PRIVACY_POLICY_VERSION', '1.0.0');
  }

  getMarketingConsentVersion(): string {
    return this.config.getOrDefault<string>('MARKETING_CONSENT_VERSION', '1.0.0');
  }
}
