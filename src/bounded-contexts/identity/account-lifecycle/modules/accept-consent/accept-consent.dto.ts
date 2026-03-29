/**
 * Accept Consent DTOs
 * Input/output DTOs for the accept consent use-case and HTTP layer
 */

import { ConsentDocumentType } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

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
  acceptedAt: z.string().datetime(),
  ipAddress: z.string(),
  userAgent: z.string(),
});

/**
 * Response schema for accept consent endpoint
 */
const AcceptConsentResponseSchema = z.object({
  message: z.string(),
  consent: ConsentRecordSchema,
});

/**
 * Request DTO for accepting user consent
 * Generated from Zod schema for NestJS validation and Swagger documentation
 */
export class AcceptConsentRequestDto extends createZodDto(AcceptConsentRequestSchema) {}

/**
 * Response DTO for accept consent endpoint
 * Generated from Zod schema for NestJS validation and Swagger documentation
 */
export class AcceptConsentResponseDto extends createZodDto(AcceptConsentResponseSchema) {}

/**
 * Type inference for request validation
 */
export type AcceptConsent = z.infer<typeof AcceptConsentRequestSchema>;
