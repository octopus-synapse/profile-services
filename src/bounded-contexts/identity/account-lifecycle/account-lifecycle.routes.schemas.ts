/**
 * Route descriptors for the account-lifecycle BC.
 *
 * All endpoints — including the previously-blocked ones — now live as
 * `Route` descriptors. The synthesizer's grown features cover what
 * used to require a hand-written controller:
 *
 * - `CreateAccount`: cookie writes go through `ctxCookieWriter(ctx)`
 *   which stages set-cookie ops on `ctx.state.__cookieJar`; the
 *   synthesizer flushes them onto the Express response.
 * - `ExportData`: `ctx.ip` / `ctx.userAgent` carry the audit trail.
 * - `AcceptConsent` / `GetConsentStatus` / `GetConsentHistory`: each
 *   declares `route.guards: [{ id: 'allow-unverified-email' }, ...]`
 *   which sets the metadata the global `EmailVerifiedGuard` /
 *   `ConsentGuard` look for via `Reflector` — so the same bypass that
 *   `@AllowUnverifiedEmail()` and `@SkipTosCheck()` decorators provided
 *   keeps working.
 */

import { z } from 'zod';
import { JsonValueSchema } from '@/shared-kernel/schemas/common/json.schema';

export const AcceptConsentRequestSchema = z.object({
  documentType: z.enum(['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'MARKETING_CONSENT']),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
});

// ─── Response schemas ────────────────────────────────────────────────
export const MessageResponseSchema = z.object({ message: z.string() });

// POST /v1/accounts handler returns userId/email + auth tokens for auto-login.
export const CreateAccountResponseSchema = z.object({
  userId: z.string(),
  email: z.string(),
  message: z.string(),
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int(),
});

// Mirrors `GdprExportData` from export-data.use-case.ts. The two
// inherently polymorphic JSON fields (`personalInfo`, item `content`)
// are modelled with explicit shapes pulled from the data-export port.
export const ExportedResumePersonalInfoSchema = z.object({
  fullName: z.string().nullable(),
  jobTitle: z.string().nullable(),
  summary: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  website: z.string().nullable(),
  linkedin: z.string().nullable(),
  github: z.string().nullable(),
});

export const GdprExportResponseSchema = z.object({
  exportedAt: z.string().datetime(),
  dataRetentionPolicy: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().nullable(),
    name: z.string().nullable(),
    username: z.string().nullable(),
    hasCompletedOnboarding: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
  consents: z.array(
    z.object({
      documentType: z.string(),
      version: z.string(),
      acceptedAt: z.string().datetime(),
      ipAddress: z.string().nullable(),
      userAgent: z.string().nullable(),
    }),
  ),
  resumes: z.array(
    z.object({
      id: z.string(),
      title: z.string().nullable(),
      slug: z.string().nullable(),
      isPublic: z.boolean(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
      personalInfo: ExportedResumePersonalInfoSchema,
      sections: z.array(
        z.object({
          sectionTypeKey: z.string(),
          semanticKind: z.string(),
          items: z.array(
            z.object({
              id: z.string(),
              order: z.number().int(),
              content: JsonValueSchema,
              createdAt: z.string().datetime(),
              updatedAt: z.string().datetime(),
            }),
          ),
        }),
      ),
    }),
  ),
  auditLogs: z.array(
    z.object({
      action: z.string(),
      entityType: z.string(),
      entityId: z.string(),
      createdAt: z.string().datetime(),
      ipAddress: z.string().nullable(),
    }),
  ),
});

export const AcceptConsentResponseSchema = z.object({
  message: z.string(),
  consent: z.object({
    id: z.string(),
    userId: z.string(),
    documentType: z.enum(['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'MARKETING_CONSENT']),
    version: z.string(),
    acceptedAt: z.string().datetime(),
    ipAddress: z.string(),
    userAgent: z.string(),
  }),
});

export const ConsentStatusResponseSchema = z.object({
  tosAccepted: z.boolean(),
  privacyPolicyAccepted: z.boolean(),
  marketingConsentAccepted: z.boolean(),
  latestTosVersion: z.string(),
  latestPrivacyPolicyVersion: z.string(),
});

// `toConsentHistoryResponse` returns an array of records — see presenter.
export const ConsentHistoryResponseSchema = z.array(
  z.object({
    id: z.string(),
    documentType: z.string(),
    version: z.string(),
    acceptedAt: z.string().datetime(),
    ipAddress: z.string(),
    userAgent: z.string(),
  }),
);
