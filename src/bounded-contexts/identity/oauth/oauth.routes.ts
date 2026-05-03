/**
 * OAuth route descriptors. The four `{github,linkedin}/{start,callback}`
 * endpoints use `OAuthPort` (`FetchOAuthAdapter`) directly — the Nest
 * Passport strategies were dropped in F5.H. `start` redirects to the
 * provider's authorize URL; `callback` exchanges the code for a profile,
 * upserts the user, and redirects to the UI. Both are `kind: 'redirect'`
 * so the SDK skips them and the swagger generator emits 302 responses.
 */

import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { HttpCtx } from '@/shared-kernel/http/context';
import type { Route } from '@/shared-kernel/http/route.types';
import { withRedirect } from '@/shared-kernel/http/route.types';
import type { OAuthHttpBundle } from './application/ports/oauth-http.bundle';

const ProviderParam = z.object({ provider: z.enum(['github', 'linkedin']) });

// ─── Response schemas ────────────────────────────────────────────────
const OAuthAvailabilityResponseSchema = z.object({ available: z.boolean() });

const OAuthProvidersResponseSchema = z.object({
  providers: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      startUrl: z.string(),
    }),
  ),
});

type Provider = 'github' | 'linkedin';

interface ProviderCatalogEntry {
  readonly id: Provider;
  readonly label: string;
  readonly startUrl: string;
}

// Static catalog of providers the BC knows about. The runtime list is
// filtered against `bundle.availability` so providers without configured
// credentials are hidden from the frontend.
const PROVIDER_CATALOG: readonly ProviderCatalogEntry[] = [
  { id: 'github', label: 'GitHub', startUrl: '/v1/auth/oauth/github/start' },
  { id: 'linkedin', label: 'LinkedIn', startUrl: '/v1/auth/oauth/linkedin/start' },
];

function callbackUri(bundle: OAuthHttpBundle, provider: Provider): string {
  const base = bundle.config.get<string>('API_BASE_URL') ?? '';
  return `${base}/api/v1/auth/oauth/${provider}/callback`;
}

function handleStart(bundle: OAuthHttpBundle, provider: Provider) {
  if (!bundle.availability.execute(provider).available) {
    throw new Error(`${provider} OAuth is not configured`);
  }
  const state = randomBytes(16).toString('hex');
  const url = bundle.oauth.buildAuthorizeUrl(provider, {
    redirectUri: callbackUri(bundle, provider),
    state,
  });
  return withRedirect(url);
}

async function handleCallback(ctx: HttpCtx, bundle: OAuthHttpBundle, provider: Provider) {
  if (!bundle.availability.execute(provider).available) {
    throw new Error(`${provider} OAuth is not configured`);
  }
  const code = (ctx.query as { code?: string }).code;
  if (!code) throw new Error('OAuth callback missing code');

  const portProfile = await bundle.oauth.exchangeCode(provider, {
    code,
    redirectUri: callbackUri(bundle, provider),
  });

  // Bridge between the framework-free `OAuthPort.OAuthProfile` (port shape)
  // and the BC's domain `OAuthProfile` (carries the upsert-relevant fields).
  const profile = {
    provider,
    providerAccountId: portProfile.providerId,
    email: portProfile.email,
    displayName: portProfile.displayName,
    photoURL: portProfile.avatarUrl,
    accessToken: portProfile.accessToken,
    refreshToken: portProfile.refreshToken,
    raw: portProfile.raw,
  };

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
