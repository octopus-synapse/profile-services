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
import type { Route } from '@/shared-kernel/http/route.types';
import { JsonValueSchema } from '@/shared-kernel/schemas/common/json.schema';
import { ctxCookieWriter } from '../authentication/application/services/ctx-cookie-bridge';
import { AccountLifecycleUseCases } from './application/ports/account-lifecycle.port';
import { CreateAccountSchema } from './application/use-cases/create-account/create-account.schema';
import { DeactivateAccountSchema } from './application/use-cases/deactivate-account/deactivate-account.schema';
import { DeleteAccountSchema } from './application/use-cases/delete-account/delete-account.schema';
import { toConsentHistoryResponse } from './infrastructure/presenters/get-consent-history.presenter';

const AcceptConsentRequestSchema = z.object({
  documentType: z.enum(['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'MARKETING_CONSENT']),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
});

// ─── Response schemas ────────────────────────────────────────────────
const MessageResponseSchema = z.object({ message: z.string() });

// POST /v1/accounts handler returns userId/email + auth tokens for auto-login.
const CreateAccountResponseSchema = z.object({
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
const ExportedResumePersonalInfoSchema = z.object({
  fullName: z.string().nullable(),
  jobTitle: z.string().nullable(),
  summary: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  website: z.string().nullable(),
  linkedin: z.string().nullable(),
  github: z.string().nullable(),
});

const GdprExportResponseSchema = z.object({
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

const AcceptConsentResponseSchema = z.object({
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

const ConsentStatusResponseSchema = z.object({
  tosAccepted: z.boolean(),
  privacyPolicyAccepted: z.boolean(),
  marketingConsentAccepted: z.boolean(),
  latestTosVersion: z.string(),
  latestPrivacyPolicyVersion: z.string(),
});

// `toConsentHistoryResponse` returns an array of records — see presenter.
const ConsentHistoryResponseSchema = z.array(
  z.object({
    id: z.string(),
    documentType: z.string(),
    version: z.string(),
    acceptedAt: z.string().datetime(),
    ipAddress: z.string(),
    userAgent: z.string(),
  }),
);

export const accountLifecycleRoutes: ReadonlyArray<Route<AccountLifecycleUseCases>> = [
  {
    method: 'POST',
    path: '/v1/accounts',
    statusCode: 201,
    auth: { kind: 'public' },
    body: CreateAccountSchema,
    response: CreateAccountResponseSchema,
    openapi: {
      summary: 'Create new account',
      tags: ['accounts'],
      description: 'Registers a new user account and returns auth tokens for auto-login.',
    },
    sdk: { exported: true, name: 'signup' },
    handler: async (ctx, bc) => {
      const dto = ctx.body as z.infer<typeof CreateAccountSchema>;
      const result = await bc.createAccount.execute({
        name: dto.name,
        email: dto.email,
        password: dto.password,
        acceptedTosVersion: dto.acceptedTosVersion,
        acceptedPrivacyVersion: dto.acceptedPrivacyVersion,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });

      // Establish cookie-based session right after signup (parity with login).
      await bc.createSession.execute({
        userId: result.userId,
        email: result.email,
        cookieWriter: ctxCookieWriter(ctx),
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return {
        userId: result.userId,
        email: result.email,
        message: 'Account created successfully.',
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/accounts/deactivate',
    auth: { kind: 'jwt' },
    body: DeactivateAccountSchema,
    response: MessageResponseSchema,
    openapi: {
      summary: 'Deactivate account',
      tags: ['account-lifecycle'],
      description: 'Deactivates the authenticated user account (soft delete).',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as { reason?: string };
      await bc.deactivateAccount.execute({
        userId: ctx.user!.userId,
        reason: body.reason,
      });
      return { message: 'Account has been deactivated.' };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/accounts',
    auth: { kind: 'jwt' },
    body: DeleteAccountSchema,
    // SkipTosCheck — the user can't be forced to accept new TOS before
    // deleting their account (LGPD parity).
    guards: [{ id: 'skip-tos-check' }],
    response: MessageResponseSchema,
    openapi: {
      summary: 'Delete account permanently',
      tags: ['account-lifecycle'],
      description:
        'Permanently deletes the user account. Requires confirmation phrase: "DELETE MY ACCOUNT".',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as { confirmationPhrase: string };
      await bc.deleteAccount.execute({
        userId: ctx.user!.userId,
        confirmationPhrase: body.confirmationPhrase,
      });
      return { message: 'Account has been permanently deleted.' };
    },
  },
  {
    method: 'GET',
    path: '/v1/me/gdpr-export',
    auth: { kind: 'jwt' },
    // GDPR export must be reachable even if the user hasn't accepted
    // the latest TOS revision — they're exercising their right to
    // their own data, not consenting to processing.
    guards: [{ id: 'skip-tos-check' }],
    response: GdprExportResponseSchema,
    openapi: {
      summary: 'Export user data (GDPR Article 20)',
      tags: ['gdpr'],
      description: 'Exports all user data in machine-readable JSON format.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      // The route's auth is JWT — `ctx.user` is populated by the global
      // JwtAuthGuard, but the legacy controller used `req.user.id` (the
      // alias the strategy sets alongside `userId`). Use `userId` here.
      const userId = ctx.user!.userId;
      return bc.exportData.execute(userId, ctx.ip, ctx.userAgent);
    },
  },
  {
    method: 'POST',
    path: '/v1/users/me/accept-consent',
    auth: { kind: 'jwt' },
    body: AcceptConsentRequestSchema,
    statusCode: 201,
    guards: [{ id: 'skip-tos-check' }, { id: 'allow-unverified-email' }],
    response: AcceptConsentResponseSchema,
    openapi: {
      summary: 'Accept Terms of Service or Privacy Policy',
      tags: ['user-consent'],
      description:
        'Records user acceptance of legal documents with IP and user agent for audit trail. ' +
        'Required before accessing protected API endpoints.',
    },
    sdk: { exported: true, name: 'acceptConsent' },
    handler: async (ctx, bc) => {
      const dto = ctx.body as z.infer<typeof AcceptConsentRequestSchema>;
      const userId = ctx.user!.userId;
      const ipAddress = dto.ipAddress ?? ctx.ip ?? '';
      const userAgent = dto.userAgent ?? ctx.userAgent ?? '';

      const consent = await bc.acceptConsent.execute({
        userId,
        documentType: dto.documentType,
        ipAddress,
        userAgent,
      });

      const documentName =
        dto.documentType === 'TERMS_OF_SERVICE'
          ? 'Terms of Service'
          : dto.documentType === 'PRIVACY_POLICY'
            ? 'Privacy Policy'
            : 'Marketing Consent';

      return {
        message: `${documentName} accepted successfully`,
        consent: {
          id: consent.id,
          userId: consent.userId,
          documentType: consent.documentType,
          version: consent.version,
          acceptedAt: consent.acceptedAt.toISOString(),
          ipAddress,
          userAgent,
        },
      };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/me/consent-status',
    auth: { kind: 'jwt' },
    guards: [{ id: 'skip-tos-check' }, { id: 'allow-unverified-email' }],
    response: ConsentStatusResponseSchema,
    openapi: {
      summary: 'Check consent acceptance status',
      tags: ['user-consent'],
      description: 'Returns which documents the user has accepted for the current versions',
    },
    sdk: { exported: true, name: 'getConsentStatus' },
    handler: async (ctx, bc) => {
      const result = await bc.getConsentStatus.execute({ userId: ctx.user!.userId });
      return result;
    },
  },
  {
    method: 'GET',
    path: '/v1/users/me/consent-history',
    auth: { kind: 'jwt' },
    guards: [{ id: 'skip-tos-check' }, { id: 'allow-unverified-email' }],
    response: ConsentHistoryResponseSchema,
    openapi: {
      summary: 'Get consent acceptance history',
      tags: ['user-consent'],
      description: 'Retrieves all consent records for the authenticated user',
    },
    sdk: { exported: true, name: 'getConsentHistory' },
    handler: async (ctx, bc) => {
      const result = await bc.getConsentHistory.execute({ userId: ctx.user!.userId });
      return toConsentHistoryResponse(result);
    },
  },
];
