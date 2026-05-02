/**
 * OAuth route descriptors. The four `{github,linkedin}/{start,callback}`
 * endpoints rely on Passport strategy guards declared on the BC's
 * module via the synthesizer's `guards:` registry. The `start` handlers
 * are intercepted by the Passport guard which redirects to the OAuth
 * provider; the `callback` handlers issue an HTTP redirect via
 * `withRedirect(...)`. Both flows are flagged `kind: 'redirect'` so the
 * swagger generator emits a 302 response and Orval skips them in the
 * client SDK — the frontend uses `window.location.href` directly via
 * the catalog returned by `/v1/auth/oauth/providers`.
 */

import { z } from 'zod';
import type { HttpCtx } from '@/shared-kernel/http/context';
import type { Route } from '@/shared-kernel/http/route';
import { withRedirect } from '@/shared-kernel/http/route';
import type { OAuthHttpBundle } from './application/ports/oauth-http.bundle';
import type { OAuthProfile } from './application/use-cases/upsert-user-from-oauth-profile/upsert-user-from-oauth-profile.use-case';

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
    kind: 'redirect' as const,
    openapi: {
      summary: 'Start GitHub OAuth sign-in.',
      tags: ['auth-oauth'],
      description: 'OAuth login endpoints',
    },
    sdk: { exported: false },
    handler: async () => undefined,
  },
  {
    method: 'GET',
    path: '/v1/auth/oauth/github/callback',
    auth: { kind: 'public' },
    guards: [{ id: 'oauth-github' }],
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
    guards: [{ id: 'oauth-linkedin' }],
    kind: 'redirect' as const,
    openapi: {
      summary: 'Start LinkedIn OAuth sign-in.',
      tags: ['auth-oauth'],
      description: 'OAuth login endpoints',
    },
    sdk: { exported: false },
    handler: async () => undefined,
  },
  {
    method: 'GET',
    path: '/v1/auth/oauth/linkedin/callback',
    auth: { kind: 'public' },
    guards: [{ id: 'oauth-linkedin' }],
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
      providers: PROVIDER_CATALOG.filter(
        (p) => bundle.availability.execute(p.id).available,
      ).map((p) => ({ id: p.id, label: p.label, startUrl: p.startUrl })),
    }),
  },
];
