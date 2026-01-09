import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsentDocumentType } from '@prisma/client';

export interface RecordAcceptanceDto {
  documentType: ConsentDocumentType;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class TosAcceptanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Check if user has accepted the current version of a document
   * @param userId - User ID to check
   * @param documentType - Type of document (defaults to TERMS_OF_SERVICE)
   * @returns true if accepted, false otherwise
   */
  async hasAcceptedCurrentVersion(
    userId: string,
    documentType: ConsentDocumentType = 'TERMS_OF_SERVICE',
  ): Promise<boolean> {
    const currentVersion = this.getCurrentVersion(documentType);

    const acceptance = await this.prisma.userConsent.findFirst({
      where: {
        userId,
        documentType,
        version: currentVersion,
      },
    });

    return acceptance !== null;
  }

  /**
   * Record user's acceptance of a document
   * @param userId - User ID
   * @param dto - Acceptance details (document type, IP, user agent)
   * @returns Created consent record
   */
  async recordAcceptance(userId: string, dto: RecordAcceptanceDto) {
    const currentVersion = this.getCurrentVersion(dto.documentType);

    return this.prisma.userConsent.create({
      data: {
        userId,
        documentType: dto.documentType,
        version: currentVersion,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      },
    });
  }

  /**
   * Get all consent records for a user
   * @param userId - User ID
   * @returns Array of consent records, ordered by most recent first
   */
  async getAcceptanceHistory(userId: string) {
    return this.prisma.userConsent.findMany({
      where: { userId },
      orderBy: { acceptedAt: 'desc' },
    });
  }

  /**
   * Get current version of a document from configuration
   * @param documentType - Type of document
   * @returns Version string (e.g., "1.0.0")
   */
  private getCurrentVersion(documentType: ConsentDocumentType): string {
    const configKey =
      documentType === 'TERMS_OF_SERVICE'
        ? 'TOS_VERSION'
        : documentType === 'PRIVACY_POLICY'
          ? 'PRIVACY_POLICY_VERSION'
          : 'MARKETING_CONSENT_VERSION';

    return this.config.get<string>(configKey, '1.0.0');
  }
}
