/**
 * Accept Consent Port (Outbound)
 * Repository port for consent persistence
 */

import type { ConsentDocumentType } from '@prisma/client';

export interface ConsentRecord {
  id: string;
  userId: string;
  documentType: ConsentDocumentType;
  version: string;
  ipAddress: string | null;
  userAgent: string | null;
  acceptedAt: Date;
}

export interface CreateConsentData {
  userId: string;
  documentType: ConsentDocumentType;
  version: string;
  ipAddress?: string;
  userAgent?: string;
}

export const CONSENT_REPOSITORY_PORT = Symbol('ConsentRepositoryPort');

export interface ConsentRepositoryPort {
  create(data: CreateConsentData): Promise<ConsentRecord>;
  findByUserAndDocumentType(
    userId: string,
    documentType: ConsentDocumentType,
    version: string,
  ): Promise<ConsentRecord | null>;
  findAllByUser(userId: string): Promise<ConsentRecord[]>;
}
