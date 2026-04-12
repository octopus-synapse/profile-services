/**
 * Get Consent History DTO
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { ConsentDocumentType } from '../../../domain/ports/consent-repository.port';

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

// Response DTO for Swagger
const ConsentHistoryResponseSchema = z.object({
  id: z.string(),
  documentType: z.string(),
  version: z.string(),
  acceptedAt: z.string(),
  ipAddress: z.string(),
  userAgent: z.string(),
});

export class ConsentHistoryResponseDto extends createZodDto(ConsentHistoryResponseSchema) {}
