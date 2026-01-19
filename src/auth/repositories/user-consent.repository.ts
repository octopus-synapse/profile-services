/**
 * User Consent Repository
 * Single Responsibility: GDPR consent and ToS acceptance records
 */

import { Injectable } from '@nestjs/common';
import { UserConsent, ConsentDocumentType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserConsentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find consent by document type
   */
  async findByDocumentType(
    userId: string,
    documentType: ConsentDocumentType,
  ): Promise<UserConsent | null> {
    return this.prisma.userConsent.findFirst({
      where: { userId, documentType },
      orderBy: { acceptedAt: 'desc' },
    });
  }

  /**
   * Get all consents for user
   */
  async findAllByUserId(userId: string): Promise<UserConsent[]> {
    return this.prisma.userConsent.findMany({
      where: { userId },
      orderBy: { acceptedAt: 'desc' },
    });
  }

  /**
   * Record new consent
   */
  async create(data: {
    userId: string;
    documentType: ConsentDocumentType;
    version: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<UserConsent> {
    return this.prisma.userConsent.create({
      data: {
        userId: data.userId,
        documentType: data.documentType,
        version: data.version,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
      },
    });
  }

  /**
   * Get all consents for user in GDPR export format
   */
  async findAllByUserIdForExport(userId: string): Promise<
    Array<{
      documentType: string;
      version: string;
      acceptedAt: Date;
      ipAddress: string | null;
      userAgent: string | null;
    }>
  > {
    return this.prisma.userConsent.findMany({
      where: { userId },
      select: {
        documentType: true,
        version: true,
        acceptedAt: true,
        ipAddress: true,
        userAgent: true,
      },
      orderBy: { acceptedAt: 'desc' },
    });
  }

  /**
   * Delete all consents for a user (for GDPR deletion)
   * Returns count of deleted consents
   */
  async deleteAllByUserId(userId: string): Promise<number> {
    const result = await this.prisma.userConsent.deleteMany({
      where: { userId },
    });
    return result.count;
  }
}
