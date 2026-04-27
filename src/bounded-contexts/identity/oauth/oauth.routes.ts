/**
 * OAuth route descriptors. The four `{github,linkedin}/{start,callback}`
 * endpoints rely on Passport strategy guards declared on the BC's
 * module via the synthesizer's `guards:` registry. The callback
 * handlers issue an HTTP redirect via `withRedirect(...)` so the
 * descriptor stays framework-free.
 */

import { z } from 'zod';
import type { OAuthProfile } from './application/use-cases/upsert-user-from-oauth-profile/upsert-user-from-oauth-profile.use-case';
import type { OAuthHttpBundle } from './application/ports/oauth-http.bundle';
import type { HttpCtx } from '@/shared-kernel/http/context';
import type { Route } from '@/shared-kernel/http/route';
import { withRedirect } from '@/shared-kernel/http/route';

const ProviderParam = z.object({ provider: z.enum(['github', 'linkedin']) });

type Provider = 'github' | 'linkedin';

async function handleCallback(ctx: HttpCtx, bundle: OAuthHttpBundle, provider: Provider) {
  if (!bundle.availability.execute(provider).available) {
    throw new Error(`${provider} OAuth is not configured`);
  }
  // Passport's strategy populates `req.user` with the OAuth profile,
  // which `buildCtx` surfaces as `ctx.user`. Cast through `unknown` to
  // the OAuth profile shape — at this point in the flow it's not yet a
  // `UserPayload`.
  const profile = ctx.user as unknown as OAuthProfile | undefined;
  if (!profile) throw new Error('OAuth did not return a profile');

  const { userId, created } = await bundle.upsert.execute(profile);

  const base = bundle.config.get<string>('UI_BASE_URL') ?? '';
  const params = new URLSearchParams({
    provider,
    userId,
    created: String(created),
  });
  if (profile.email) params.set('email', profile.email);
  const externalLogin = (profile.raw as { login?: unknown } | null)?.login;
  if (provider === 'github' && typeof externalLogin === 'string') {
    params.set('githubLogin', externalLogin);
  }
  return withRedirect(`${base}/auth/oauth-complete?${params.toString()}`);
}

export const oauthRoutes: ReadonlyArray<Route<OAuthHttpBundle>> = [
  {
    method: 'GET',
    path: '/v1/auth/oauth/github/start',
    auth: { kind: 'public' },
    guards: [{ id: 'oauth-github' }],
    openapi: {
      summary: 'Start GitHub OAuth sign-in.',
      tags: ['auth-oauth'],
      description: 'OAuth login endpoints',
    },
    sdk: { exported: true },
    handler: async () => undefined,
  },
  {
    method: 'GET',
    path: '/v1/auth/oauth/github/callback',
    auth: { kind: 'public' },
    guards: [{ id: 'oauth-github' }],
    openapi: {
      summary: 'GitHub OAuth callback.',
      tags: ['auth-oauth'],
      description: 'OAuth login endpoints',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => handleCallback(ctx, bundle, 'github'),
  },
  {
    method: 'GET',
    path: '/v1/auth/oauth/linkedin/start',
    auth: { kind: 'public' },
    guards: [{ id: 'oauth-linkedin' }],
    openapi: {
      summary: 'Start LinkedIn OAuth sign-in.',
      tags: ['auth-oauth'],
      description: 'OAuth login endpoints',
    },
    sdk: { exported: true },
    handler: async () => undefined,
  },
  {
    method: 'GET',
    path: '/v1/auth/oauth/linkedin/callback',
    auth: { kind: 'public' },
    guards: [{ id: 'oauth-linkedin' }],
    openapi: {
      summary: 'LinkedIn OAuth callback.',
      tags: ['auth-oauth'],
      description: 'OAuth login endpoints',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => handleCallback(ctx, bundle, 'linkedin'),
  },
  {
    method: 'GET',
    path: '/v1/auth/oauth/available/:provider',
    auth: { kind: 'public' },
    params: ProviderParam,
    openapi: {
      summary: 'Whether a given OAuth provider is configured.',
      tags: ['auth-oauth'],
      description: 'OAuth login endpoints',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { provider } = ctx.params as { provider: Provider };
      return bundle.availability.execute(provider);
    },
  },
];
