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
import { ctxCookieWriter } from '../authentication/application/services/ctx-cookie-bridge';
import {
  AcceptConsentRequestSchema,
  AcceptConsentResponseSchema,
  ConsentHistoryResponseSchema,
  ConsentStatusResponseSchema,
  CreateAccountResponseSchema,
  GdprExportResponseSchema,
  MessageResponseSchema,
} from './account-lifecycle.routes.schemas';
import { AccountLifecycleUseCases } from './application/ports/account-lifecycle.port';
import { CreateAccountSchema } from './application/use-cases/create-account/create-account.schema';
import { DeactivateAccountSchema } from './application/use-cases/deactivate-account/deactivate-account.schema';
import { DeleteAccountSchema } from './application/use-cases/delete-account/delete-account.schema';
import { toConsentHistoryResponseDto } from './infrastructure/presenters/get-consent-history.presenter';

export const accountLifecycleRoutes: ReadonlyArray<Route<AccountLifecycleUseCases>> = [
  {
    method: 'POST',
    path: '/v1/accounts',
    statusCode: 201,
    auth: { kind: 'public' },
    body: CreateAccountSchema,
    response: CreateAccountResponseSchema,
    guards: [
      // P0-#4: signup is unauthenticated and costs ~80ms per bcrypt hash
      // (cost 12). Without an IP cap a bot creates accounts faster than the
      // SMTP server can flush verification emails, polluting the userbase
      // and damaging deliverability. 3/10min is generous for a real human
      // and crushes a botnet origin.
      { id: 'rate-limit', metadata: { points: 3, duration: 600, keyStrategy: 'ip' } },
    ],
    openapi: {
      summary: 'Create new account',
      tags: ['accounts'],
      description:
        'Registers a new user account. Authentication is established via httpOnly session cookie set in parallel; no bearer tokens are returned in the body.',
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
      return { code: 'ACCOUNT_DEACTIVATED' as const };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/accounts',
    auth: { kind: 'jwt' },
    body: DeleteAccountSchema,
    // SkipTosCheck — the user can't be forced to accept new TOS before
    // deleting their account (LGPD parity).
    guards: [
      { id: 'skip-tos-check' },
      // P0-#8 follow-up: rate-limit re-auth attempts.
      { id: 'rate-limit', metadata: { points: 3, duration: 60, keyStrategy: 'userId' } },
    ],
    response: MessageResponseSchema,
    openapi: {
      summary: 'Delete account permanently',
      tags: ['account-lifecycle'],
      description:
        'Permanently deletes the user account. Requires confirmation phrase: "DELETE MY ACCOUNT" ' +
        'AND the current password (re-authentication gate to prevent stolen-cookie deletes).',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as { confirmationPhrase: string; currentPassword: string };
      await bc.deleteAccount.execute({
        userId: ctx.user!.userId,
        confirmationPhrase: body.confirmationPhrase,
        currentPassword: body.currentPassword,
      });
      return { code: 'ACCOUNT_DELETED' as const };
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
      // P1 #14 — audit trail MUST be server-derived. Never trust a
      // client-supplied IP / userAgent here; the schema dropped both
      // fields so even a misbehaving client can't smuggle them in.
      const ipAddress = ctx.ip ?? '';
      const userAgent = ctx.userAgent ?? '';

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
      return toConsentHistoryResponseDto(result);
    },
  },
];
