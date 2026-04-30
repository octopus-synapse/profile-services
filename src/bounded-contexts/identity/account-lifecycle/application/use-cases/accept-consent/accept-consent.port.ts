/**
 * Accept Consent Port (Outbound)
 * Repository port for consent persistence
 */

import type { ConsentDocumentType } from '../../../domain/ports/consent-repository.port';

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

export abstract class ConsentRepositoryPort {
  abstract create(data: CreateConsentData): Promise<ConsentRecord>;
  abstract findByUserAndDocumentType(
    userId: string,
    documentType: ConsentDocumentType,
    version: string,
  ): Promise<ConsentRecord | null>;
  abstract findAllByUser(userId: string): Promise<ConsentRecord[]>;
}
