/**
 * Consent/GDPR Schemas
 *
 * Validation for user consent operations (ToS, Privacy Policy).
 * Maps to profile-services/src/auth/controllers/user-consent.controller.ts
 */

import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export const ConsentDocumentTypeSchema = z.enum([
 "TERMS_OF_SERVICE",
 "PRIVACY_POLICY",
 "MARKETING_CONSENT",
]);

export type ConsentDocumentType = z.infer<typeof ConsentDocumentTypeSchema>;

// ============================================================================
// Request DTOs
// ============================================================================

/**
 * Schema for accepting a consent document
 * POST /v1/users/me/accept-consent
 */
export const AcceptConsentSchema = z.object({
 documentType: ConsentDocumentTypeSchema,
 ipAddress: z.string().ip().optional(),
 userAgent: z.string().optional(),
});

export type AcceptConsent = z.infer<typeof AcceptConsentSchema>;

// ============================================================================
// Response DTOs
// ============================================================================

/**
 * A single consent record from the database
 */
export const ConsentRecordSchema = z.object({
 id: z.string().uuid(),
 userId: z.string().uuid(),
 documentType: ConsentDocumentTypeSchema,
 version: z.string(),
 acceptedAt: z.string().datetime(),
 ipAddress: z.string(),
 userAgent: z.string(),
});

export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;

/**
 * Response from POST /v1/users/me/accept-consent
 */
export const AcceptConsentResponseSchema = z.object({
 message: z.string(),
 consent: ConsentRecordSchema,
});

export type AcceptConsentResponse = z.infer<typeof AcceptConsentResponseSchema>;

/**
 * User's current consent status
 * GET /v1/users/me/consent-status
 */
export const ConsentStatusSchema = z.object({
 tosAccepted: z.boolean(),
 privacyPolicyAccepted: z.boolean(),
 marketingConsentAccepted: z.boolean(),
 latestTosVersion: z.string(),
 latestPrivacyPolicyVersion: z.string(),
});

export type ConsentStatus = z.infer<typeof ConsentStatusSchema>;

/**
 * Consent history (list of all consent records)
 * GET /v1/users/me/consent-history
 */
export const ConsentHistorySchema = z.array(ConsentRecordSchema);

export type ConsentHistory = z.infer<typeof ConsentHistorySchema>;
