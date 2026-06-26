/**
 * Route descriptors for the password-management BC. Replaces
 * `ChangePasswordController`, `ResetPasswordController`, and
 * `ForgotPasswordController`.
 *
 * The forgot-password endpoint declares its per-route throttler limit
 * via `Route.guards: [{ id: 'throttle', metadata: { default: { … } } }]`
 * — the BC's module wires `RouteThrottlerGuard` (a thin adapter over
 * `ThrottlerGuard` from `@nestjs/throttler`) into the registry.
 */

import type { Route } from '@/shared-kernel/http/route.types';
import { renderSuccessMessageForRequest } from '@/shared-kernel/http/success-message';
import { PasswordManagementUseCases } from './application/ports/password-management.port';
import { ChangePasswordSchema } from './infrastructure/controllers/change-password.schema';
import { ResetPasswordSchema } from './infrastructure/controllers/reset-password.schema';
import {
  ConfirmEmailChangeSchema,
  ConfirmPasswordChangeSchema,
  EmailChangeCodeSentResponseSchema,
  ForgotPasswordSchema,
  PasswordChangeCodeSentResponseSchema,
  PasswordMessageResponseSchema,
  RequestEmailChangeSchema,
  RequestPasswordChangeSchema,
} from './password-management.routes.schemas';

export const passwordManagementRoutes: ReadonlyArray<Route<PasswordManagementUseCases>> = [
  {
    method: 'POST',
    path: '/v1/auth/forgot-password',
    auth: { kind: 'public' },
    body: ForgotPasswordSchema,
    statusCode: 200,
    response: PasswordMessageResponseSchema,
    guards: [{ id: 'throttle', metadata: { default: { limit: 5, ttl: 60000 } } }],
    openapi: {
      summary: 'Request password reset',
      tags: ['password-management'],
      description:
        'Sends a password reset email if the account exists. Always returns success to prevent email enumeration.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as { email: string };
      await bc.forgotPassword.execute({ email: body.email });
      return { code: 'PASSWORD_RESET_LINK_SENT' as const };
    },
  },
  {
    method: 'POST',
    path: '/v1/me/password/change',
    auth: { kind: 'jwt' },
    body: ChangePasswordSchema,
    response: PasswordMessageResponseSchema,
    guards: [
      // P0-#4: keyed by userId since the route is jwt-gated; same user can't
      // brute-force their own currentPassword.
      { id: 'rate-limit', metadata: { points: 5, duration: 60, keyStrategy: 'userId' } },
      { id: 'multi-step-flow' },
    ],
    openapi: {
      summary: 'Change password',
      tags: ['password-management'],
      description:
        'Changes the password for the authenticated user after verifying the current password.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as { currentPassword: string; newPassword: string };
      await bc.changePassword.execute({
        userId: ctx.user!.userId,
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
      });
      return { code: 'PASSWORD_CHANGED' as const };
    },
  },
  {
    method: 'POST',
    path: '/v1/me/password/change/request',
    auth: { kind: 'jwt' },
    body: RequestPasswordChangeSchema,
    statusCode: 200,
    response: PasswordChangeCodeSentResponseSchema,
    guards: [
      { id: 'rate-limit', metadata: { points: 5, duration: 60, keyStrategy: 'userId' } },
      { id: 'multi-step-flow' },
    ],
    openapi: {
      summary: 'Request password change (step 1, code-confirmed)',
      tags: ['password-management'],
      description:
        'Validates the current + new password and emails a 6-digit confirmation code. The password is only changed after POST /v1/me/password/change/confirm.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as { currentPassword: string; newPassword: string };
      const result = await bc.requestPasswordChange.execute({
        userId: ctx.user!.userId,
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
      });
      // Extra fields beyond `{ code }` make the mounter skip message rendering,
      // so localize inline (mirrors the email-verification /send route).
      const { message } = renderSuccessMessageForRequest(
        { code: 'PASSWORD_CHANGE_CODE_SENT' },
        ctx.headers['accept-language'],
      );
      return {
        code: 'PASSWORD_CHANGE_CODE_SENT' as const,
        message,
        cooldownSeconds: result.cooldownSeconds,
        testCode: result.testCode,
      };
    },
  },
  {
    method: 'POST',
    path: '/v1/me/password/change/confirm',
    auth: { kind: 'jwt' },
    body: ConfirmPasswordChangeSchema,
    response: PasswordMessageResponseSchema,
    guards: [
      { id: 'rate-limit', metadata: { points: 5, duration: 60, keyStrategy: 'userId' } },
      { id: 'multi-step-flow' },
    ],
    openapi: {
      summary: 'Confirm password change (step 2, code-confirmed)',
      tags: ['password-management'],
      description: 'Applies the password change after verifying the emailed 6-digit code.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as { code: string };
      await bc.confirmPasswordChange.execute({ userId: ctx.user!.userId, code: body.code });
      return { code: 'PASSWORD_CHANGED' as const };
    },
  },
  {
    method: 'POST',
    path: '/v1/me/email/change/request',
    auth: { kind: 'jwt' },
    body: RequestEmailChangeSchema,
    statusCode: 200,
    response: EmailChangeCodeSentResponseSchema,
    guards: [
      { id: 'rate-limit', metadata: { points: 5, duration: 60, keyStrategy: 'userId' } },
      { id: 'multi-step-flow' },
    ],
    openapi: {
      summary: 'Request email change (step 1, code-confirmed)',
      tags: ['password-management'],
      description:
        'Verifies the current password and emails a 6-digit code to the new address. The email is only changed after POST /v1/me/email/change/confirm.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as { currentPassword: string; newEmail: string };
      const result = await bc.requestEmailChange.execute({
        userId: ctx.user!.userId,
        currentPassword: body.currentPassword,
        newEmail: body.newEmail,
      });
      const { message } = renderSuccessMessageForRequest(
        { code: 'EMAIL_CHANGE_CODE_SENT' },
        ctx.headers['accept-language'],
      );
      return {
        code: 'EMAIL_CHANGE_CODE_SENT' as const,
        message,
        cooldownSeconds: result.cooldownSeconds,
        testCode: result.testCode,
      };
    },
  },
  {
    method: 'POST',
    path: '/v1/me/email/change/confirm',
    auth: { kind: 'jwt' },
    body: ConfirmEmailChangeSchema,
    response: PasswordMessageResponseSchema,
    guards: [
      { id: 'rate-limit', metadata: { points: 5, duration: 60, keyStrategy: 'userId' } },
      { id: 'multi-step-flow' },
    ],
    openapi: {
      summary: 'Confirm email change (step 2, code-confirmed)',
      tags: ['password-management'],
      description: 'Applies the email change after verifying the emailed 6-digit code.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as { code: string };
      await bc.confirmEmailChange.execute({ userId: ctx.user!.userId, code: body.code });
      return { code: 'EMAIL_CHANGED' as const };
    },
  },
  {
    method: 'POST',
    path: '/v1/auth/reset-password',
    auth: { kind: 'public' },
    body: ResetPasswordSchema,
    response: PasswordMessageResponseSchema,
    guards: [
      // P0-#4 + P1 #5: token is 256-bit base64url + sha256-hashed at
      // rest, so brute-forcing is infeasible; the IP cap exists to
      // throttle the DoS angle (each call does a DB lookup + bcrypt
      // re-hash on success). Tightened from 5/min to 5/hour per IP so
      // an attacker can't sustain bcrypt churn against the route.
      { id: 'rate-limit', metadata: { points: 5, duration: 3600, keyStrategy: 'ip' } },
      { id: 'multi-step-flow' },
    ],
    openapi: {
      summary: 'Reset password with token',
      tags: ['password-management'],
      description: 'Resets the user password using a valid reset token received via email.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as { token: string; newPassword: string };
      await bc.resetPassword.execute({
        token: body.token,
        newPassword: body.newPassword,
      });
      return { code: 'PASSWORD_RESET' as const };
    },
  },
];
