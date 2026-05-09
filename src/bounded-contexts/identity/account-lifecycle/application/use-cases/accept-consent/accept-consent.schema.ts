import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import { ConsentDocumentType } from '../../../domain/ports/consent-repository.port';

// ============================================================================
// Use-case DTOs (internal)
// ============================================================================

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

// ============================================================================
// HTTP DTOs (controller layer)
// ============================================================================

/**
 * Consent document type enum
 */
const ConsentDocumentTypeSchema = z.enum([
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'MARKETING_CONSENT',
]);

/**
 * Request schema for accepting a consent document
 * POST /v1/users/me/accept-consent
 */
const AcceptConsentRequestSchema = z.object({
  documentType: ConsentDocumentTypeSchema,
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
});

/**
 * Consent record in response
 */
const ConsentRecordSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  documentType: ConsentDocumentTypeSchema,
  version: z.string(),
  acceptedAt: IsoDateTimeSchema,
  ipAddress: z.string(),
  userAgent: z.string(),
});

/**
 * Response schema for accept consent endpoint
 */
const AcceptConsentResponseSchema = z.object({ message: z.string(), consent: ConsentRecordSchema });
/**
 * Type inference for request validation
 */
export type AcceptConsent = z.infer<typeof AcceptConsentRequestSchema>;

export type ConsentDocumentTypeDto = z.infer<typeof ConsentDocumentTypeSchema>;

export type AcceptConsentRequestDto = z.infer<typeof AcceptConsentRequestSchema>;

export type ConsentRecordDto = z.infer<typeof ConsentRecordSchema>;

export type AcceptConsentResponseDto = z.infer<typeof AcceptConsentResponseSchema>;
