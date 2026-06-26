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
import { renderSuccessMessageForRequest } from '@/shared-kernel/http/success-message';
import { ctxCookieWriter } from '../authentication/application/services/ctx-cookie-bridge';
import {
  AcceptConsentRequestSchema,
  AcceptConsentResponseSchema,
  AccountDeletionCodeSentResponseSchema,
  ConsentHistoryResponseSchema,
  ConsentStatusResponseSchema,
  CreateAccountResponseSchema,
  GdprExportResponseSchema,
  MessageResponseSchema,
} from './account-lifecycle.routes.schemas';
import { AccountLifecycleUseCases } from './application/ports/account-lifecycle.port';
import { ConfirmAccountDeletionSchema } from './application/use-cases/confirm-account-deletion/confirm-account-deletion.schema';
import { CreateAccountSchema } from './application/use-cases/create-account/create-account.schema';
import { DeactivateAccountSchema } from './application/use-cases/deactivate-account/deactivate-account.schema';
import { RequestAccountDeletionSchema } from './application/use-cases/request-account-deletion/request-account-deletion.schema';
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
      // and damaging deliverability. 10/10min keeps the bot-spam thesis
      // intact (bots typically fire dozens per minute, so 10/600s still
      // crushes them) while letting CI re-runs and the contract harness
      // probe POST /v1/accounts without flaking.
      { id: 'rate-limit', metadata: { points: 10, duration: 600, keyStrategy: 'ip' } },
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
    method: 'POST',
    path: '/v1/accounts/delete/request',
    auth: { kind: 'jwt' },
    body: RequestAccountDeletionSchema,
    statusCode: 200,
    // SkipTosCheck — the user can't be forced to accept new TOS before
    // deleting their account (LGPD parity).
    guards: [
      { id: 'skip-tos-check' },
      // P0-#8 follow-up: rate-limit re-auth attempts.
      { id: 'rate-limit', metadata: { points: 3, duration: 60, keyStrategy: 'userId' } },
      { id: 'multi-step-flow' },
    ],
    response: AccountDeletionCodeSentResponseSchema,
    openapi: {
      summary: 'Request account deletion (step 1, code-confirmed)',
      tags: ['account-lifecycle'],
      description:
        'Validates the confirmation phrase "DELETE MY ACCOUNT" AND the current password ' +
        '(re-authentication gate to prevent stolen-cookie deletes), then emails a 6-digit ' +
        'code. The account is only erased after POST /v1/accounts/delete/confirm.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as { confirmationPhrase: string; currentPassword: string };
      const result = await bc.requestAccountDeletion.execute({
        userId: ctx.user!.userId,
        confirmationPhrase: body.confirmationPhrase,
        currentPassword: body.currentPassword,
      });
      // Extra fields beyond `{ code }` make the mounter skip message rendering,
      // so localize inline (mirrors the password-change /request route).
      const { message } = renderSuccessMessageForRequest(
        { code: 'ACCOUNT_DELETION_CODE_SENT' },
        ctx.headers['accept-language'],
      );
      return {
        code: 'ACCOUNT_DELETION_CODE_SENT' as const,
        message,
        cooldownSeconds: result.cooldownSeconds,
        testCode: result.testCode,
      };
    },
  },
  {
    method: 'POST',
    path: '/v1/accounts/delete/confirm',
    // Idempotent confirmation that returns a localized message — not a
    // resource creation. Mirror the sibling `delete/request` route's 200.
    statusCode: 200,
    auth: { kind: 'jwt' },
    body: ConfirmAccountDeletionSchema,
    guards: [
      { id: 'skip-tos-check' },
      { id: 'rate-limit', metadata: { points: 3, duration: 60, keyStrategy: 'userId' } },
      { id: 'multi-step-flow' },
    ],
    response: MessageResponseSchema,
    openapi: {
      summary: 'Confirm account deletion (step 2, code-confirmed)',
      tags: ['account-lifecycle'],
      description: 'Permanently erases the account after verifying the emailed 6-digit code.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as { code: string };
      await bc.confirmAccountDeletion.execute({ userId: ctx.user!.userId, code: body.code });
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
