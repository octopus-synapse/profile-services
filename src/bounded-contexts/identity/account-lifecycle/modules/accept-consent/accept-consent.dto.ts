/**
 * Accept Consent DTO
 * Input/output DTOs for the accept consent use-case
 */

import { ConsentDocumentType } from '@prisma/client';

export interface AcceptConsentInput {
  userId: string;
  documentType: ConsentDocumentType;
  ipAddress?: string;
  userAgent?: string;
}

export interface AcceptConsentOutput {
  id: string;
  userId: string;
  documentType: ConsentDocumentType;
  version: string;
  acceptedAt: Date;
}
