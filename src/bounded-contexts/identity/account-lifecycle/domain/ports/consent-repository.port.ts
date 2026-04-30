/**
 * Consent Repository Port (Outbound)
 * Repository port for consent persistence
 */

export const ConsentDocumentType = {
  TERMS_OF_SERVICE: 'TERMS_OF_SERVICE',
  PRIVACY_POLICY: 'PRIVACY_POLICY',
  MARKETING_CONSENT: 'MARKETING_CONSENT',
} as const;
export type ConsentDocumentType = (typeof ConsentDocumentType)[keyof typeof ConsentDocumentType];

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
