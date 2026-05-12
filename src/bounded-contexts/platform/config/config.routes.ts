/**
 * Route descriptors for the platform/config BC.
 *
 * Frontend forms (sign-up, password change, password strength meter)
 * mirror the server-side `PASSWORD_POLICY` constant. To avoid drift —
 * frontend hardcoding `min 8 + upper + special char` while backend
 * may evolve the policy — we expose the canonical constants over a
 * public GET endpoint and let the frontend fetch once at boot.
 */

import type { Route } from '@/shared-kernel/http/route.types';
import { PASSWORD_POLICY } from '@/shared-kernel/schemas/primitives/password.schema';
import { PasswordPolicyResponseSchema } from './config.routes.schemas';

// No use cases — this BC just exposes constants. The bundle type is the
// empty object so the synthesizer has something to bind against.
export type ConfigUseCases = Record<string, never>;

export const configRoutes: ReadonlyArray<Route<ConfigUseCases>> = [
  {
    method: 'GET',
    path: '/v1/config/password-policy',
    auth: { kind: 'public' },
    response: PasswordPolicyResponseSchema,
    openapi: {
      summary: 'Server-enforced password policy',
      tags: ['config'],
      description:
        'Returns the password validation constants the backend enforces. Frontend forms read this at boot so they reject weak passwords client-side with the same rules the server applies on submit.',
    },
    sdk: { exported: true },
    handler: async () => ({
      minLength: PASSWORD_POLICY.minLength,
      maxLength: PASSWORD_POLICY.maxLength,
      requireUppercase: PASSWORD_POLICY.requireUppercase,
      requireLowercase: PASSWORD_POLICY.requireLowercase,
      requireNumber: PASSWORD_POLICY.requireNumber,
      requireSpecialChar: PASSWORD_POLICY.requireSpecialChar,
      specialChars: PASSWORD_POLICY.specialChars,
    }),
  },
];
