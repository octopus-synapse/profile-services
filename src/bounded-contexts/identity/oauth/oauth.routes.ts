/**
 * OAuth route descriptors. The four `{github,linkedin}/{start,callback}`
 * endpoints use `OAuthPort` (`FetchOAuthAdapter`) directly — the Nest
 * Passport strategies were dropped in F5.H. `start` redirects to the
 * provider's authorize URL; `callback` exchanges the code for a profile,
 * upserts the user, and redirects to the UI. Both are `kind: 'redirect'`
 * so the SDK skips them and the swagger generator emits 302 responses.
 */

import type { Route } from '@/shared-kernel/http/route.types';
import type { OAuthHttpBundle } from './application/ports/oauth-http.bundle';
import {
  handleCallback,
  handleStart,
  OAuthAvailabilityResponseSchema,
  OAuthProvidersResponseSchema,
  PROVIDER_CATALOG,
  Provider,
  ProviderParam,
} from './oauth.routes.schemas';

export const oauthRoutes: ReadonlyArray<Route<OAuthHttpBundle>> = [
  {
    method: 'GET',
    path: '/v1/auth/oauth/github/start',
    auth: { kind: 'public' },
    kind: 'redirect' as const,
    openapi: {
      summary: 'Start GitHub OAuth sign-in.',
      tags: ['auth-oauth'],
      description: 'OAuth login endpoints',
    },
    sdk: { exported: false },
    handler: async (_ctx, bundle) => handleStart(bundle, 'github'),
  },
  {
    method: 'GET',
    path: '/v1/auth/oauth/github/callback',
    auth: { kind: 'public' },
    kind: 'redirect' as const,
    openapi: {
      summary: 'GitHub OAuth callback.',
      tags: ['auth-oauth'],
      description: 'OAuth login endpoints',
    },
    sdk: { exported: false },
    handler: async (ctx, bundle) => handleCallback(ctx, bundle, 'github'),
  },
  {
    method: 'GET',
    path: '/v1/auth/oauth/linkedin/start',
    auth: { kind: 'public' },
    kind: 'redirect' as const,
    openapi: {
      summary: 'Start LinkedIn OAuth sign-in.',
      tags: ['auth-oauth'],
      description: 'OAuth login endpoints',
    },
    sdk: { exported: false },
    handler: async (_ctx, bundle) => handleStart(bundle, 'linkedin'),
  },
  {
    method: 'GET',
    path: '/v1/auth/oauth/linkedin/callback',
    auth: { kind: 'public' },
    kind: 'redirect' as const,
    openapi: {
      summary: 'LinkedIn OAuth callback.',
      tags: ['auth-oauth'],
      description: 'OAuth login endpoints',
    },
    sdk: { exported: false },
    handler: async (ctx, bundle) => handleCallback(ctx, bundle, 'linkedin'),
  },
  {
    method: 'GET',
    path: '/v1/auth/oauth/available/:provider',
    auth: { kind: 'public' },
    params: ProviderParam,
    response: OAuthAvailabilityResponseSchema,
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
  {
    method: 'GET',
    path: '/v1/auth/oauth/providers',
    auth: { kind: 'public' },
    response: OAuthProvidersResponseSchema,
    openapi: {
      summary: 'List enabled OAuth providers (server-driven catalog)',
      tags: ['auth-oauth'],
      description:
        'Frontend renders a button per provider and uses `window.location.href = startUrl` to begin the flow.',
    },
    sdk: { exported: true },
    handler: async (_ctx, bundle) => ({
      providers: PROVIDER_CATALOG.filter((p) => bundle.availability.execute(p.id).available).map(
        (p) => ({ id: p.id, label: p.label, startUrl: p.startUrl }),
      ),
    }),
  },
];
