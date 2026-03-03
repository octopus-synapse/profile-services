/**
 * Get Consent History DTO
 */

import type { ConsentDocumentType } from '@prisma/client';

export interface GetConsentHistoryInput {
  userId: string;
}

export interface ConsentHistoryItem {
  id: string;
  documentType: ConsentDocumentType;
  version: string;
  acceptedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

export type GetConsentHistoryOutput = ConsentHistoryItem[];
