/**
 * Route descriptors for the email-verification BC. Replaces
 * `VerifyEmailController` and `SendVerificationController`.
 *
 * The send/resend-status endpoints rely on the global
 * `EmailVerifiedGuard` short-circuiting when the
 * `allowUnverifiedEmail` metadata is present — declared via
 * `route.guards: [{ id: 'allow-unverified-email' }]`. The matching
 * registry lives in `email-verification.module.ts`.
 */

import type { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route.types';
import { renderSuccessMessageForRequest } from '@/shared-kernel/http/success-message';
import { EmailVerificationUseCases } from './application/ports/email-verification.port';
import {
  ConfirmPreSignupVerificationSchema,
  StartPreSignupVerificationSchema,
} from './application/use-cases/start-pre-signup-verification/start-pre-signup-verification.schema';
import {
  ConfirmPreSignupVerificationResponseSchema,
  ResendCooldownResponseSchema,
  SendVerificationResponseSchema,
  StartPreSignupVerificationResponseSchema,
  VerifyEmailResponseSchema,
} from './email-verification.routes.schemas';
import { VerifyEmailSchema } from './infrastructure/controllers/verify-email.schema';

export const emailVerificationRoutes: ReadonlyArray<Route<EmailVerificationUseCases>> = [
  {
    method: 'POST',
    path: '/v1/auth/email-verification/verify',
    auth: { kind: 'public' },
    body: VerifyEmailSchema,
    response: VerifyEmailResponseSchema,
    guards: [
      // P0-#4 + P1 #4 — the verification code is 6 digits (10^6
      // keyspace, 15min TTL); 5/5min keyed by IP was the original bar
      // but a small botnet (~1000 IPs) could still sweep ~7% of the
      // keyspace per token. Tighten to 3/5min and surface a tighter
      // ceiling on a botnet-scale attack. A real user typing the code
      // wrong twice still has a free attempt within the same window.
      { id: 'rate-limit', metadata: { points: 3, duration: 300, keyStrategy: 'ip' } },
      { id: 'multi-step-flow' },
    ],
    openapi: {
      summary: 'Verify email with token',
      tags: ['email-verification'],
      description: 'Verifies the user email using the token received via email.',
    },
    sdk: { exported: true, name: 'verify' },
    handler: async (ctx, bc) => {
      const { token } = ctx.body as { token: string };
      const result = await bc.verifyEmail.execute({ token });
      return { email: result.email, message: 'Email has been verified successfully.' };
    },
  },
  {
    method: 'POST',
    path: '/v1/auth/email-verification/start',
    auth: { kind: 'public' },
    // Sends a code; creates no addressable resource — override the
    // mounter's auto-201, matching the sibling /send route.
    statusCode: 200,
    body: StartPreSignupVerificationSchema,
    response: StartPreSignupVerificationResponseSchema,
    guards: [
      // Sends an e-mail per hit — cap hard. 5/5min per IP covers a human
      // (first send + a couple of resends after the 60s cooldown) while a
      // spammer burning our sender reputation starves. The use case adds a
      // per-e-mail 60s cooldown on top.
      { id: 'rate-limit', metadata: { points: 5, duration: 300, keyStrategy: 'ip' } }, // lint-allow-magic-number: the budget IS the policy — rationale above
      { id: 'multi-step-flow' },
    ],
    openapi: {
      summary: 'Start pre-signup e-mail verification (identifier-first)',
      tags: ['email-verification'],
      description:
        'Sends a 6-digit code to an e-mail that has no account yet — step 2 of the unified ' +
        '"sign in or create account" flow (e-mail → code → password). Rejects e-mails that ' +
        'already have an account; the code lives 15 minutes and resends respect a 60s cooldown.',
    },
    sdk: { exported: true, name: 'startPreSignupVerification' },
    handler: async (ctx, bc) => {
      const dto = ctx.body as z.infer<typeof StartPreSignupVerificationSchema>;
      const result = await bc.startPreSignupVerification.execute({ email: dto.email });
      const { testCode, ...cooldown } = result;
      const { message } = renderSuccessMessageForRequest(
        { code: 'EMAIL_VERIFICATION_SENT' },
        ctx.headers['accept-language'],
      );
      return { code: 'EMAIL_VERIFICATION_SENT' as const, message, cooldown, testCode };
    },
  },
  {
    method: 'POST',
    path: '/v1/auth/email-verification/confirm',
    auth: { kind: 'public' },
    // Verifies a code and hands back a token; creates nothing — same 200
    // as the sibling /verify route.
    statusCode: 200,
    body: ConfirmPreSignupVerificationSchema,
    response: ConfirmPreSignupVerificationResponseSchema,
    guards: [
      // Same bar as /verify: 6-digit keyspace, 15min TTL — 3/5min per IP,
      // and the use case burns the challenge after 5 wrong codes total.
      { id: 'rate-limit', metadata: { points: 3, duration: 300, keyStrategy: 'ip' } }, // lint-allow-magic-number: the budget IS the policy — rationale above
      { id: 'multi-step-flow' },
    ],
    openapi: {
      summary: 'Confirm pre-signup e-mail verification code',
      tags: ['email-verification'],
      description:
        'Checks the 6-digit code sent by /start and, on success, returns the registration ' +
        'token `POST /v1/accounts` accepts as `emailVerificationToken` — the account is then ' +
        'created with the e-mail already verified.',
    },
    sdk: { exported: true, name: 'confirmPreSignupVerification' },
    handler: async (ctx, bc) => {
      const dto = ctx.body as z.infer<typeof ConfirmPreSignupVerificationSchema>;
      return bc.confirmPreSignupVerification.execute({ email: dto.email, code: dto.code });
    },
  },
  {
    method: 'POST',
    path: '/v1/auth/email-verification/send',
    auth: { kind: 'jwt' },
    statusCode: 200,
    response: SendVerificationResponseSchema,
    guards: [{ id: 'allow-unverified-email' }],
    openapi: {
      summary: 'Send verification email',
      tags: ['email-verification'],
      description: 'Sends a verification email to the authenticated user. No body required.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const resendResult = await bc.sendVerificationEmail.execute({ userId: ctx.user!.userId });
      const { testCode, ...cooldown } = resendResult;
      // The mounter's `isSuccessMessage` only renders `message` when the
      // body is exactly `{ code, params? }`. The extra `cooldown` field
      // makes it bail, so render the localized `message` inline here.
      const { message } = renderSuccessMessageForRequest(
        { code: 'EMAIL_VERIFICATION_SENT' },
        ctx.headers['accept-language'],
      );
      return { code: 'EMAIL_VERIFICATION_SENT' as const, message, cooldown, testCode };
    },
  },
  {
    method: 'GET',
    path: '/v1/auth/email-verification/resend-status',
    auth: { kind: 'jwt' },
    response: ResendCooldownResponseSchema,
    guards: [{ id: 'allow-unverified-email' }],
    openapi: {
      summary: 'Get verification email resend cooldown',
      tags: ['email-verification'],
      description:
        'Returns how many seconds the authenticated user must wait before requesting another verification email. The UI uses this so the countdown survives page reloads.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const cooldown = await bc.getResendCooldown.execute({ userId: ctx.user!.userId });
      return cooldown;
    },
  },
];
