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
import { withRedirect } from '@/shared-kernel/http/route.types';
import type { OAuthHttpBundle } from './application/ports/oauth-http.bundle';

export const ProviderParam = z.object({ provider: z.enum(['github', 'linkedin']) });

// ─── Response schemas ────────────────────────────────────────────────
export const OAuthAvailabilityResponseSchema = z.object({ available: z.boolean() });

export const OAuthProvidersResponseSchema = z.object({
  providers: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      startUrl: z.string(),
    }),
  ),
});

export type Provider = 'github' | 'linkedin';

export interface ProviderCatalogEntry {
  readonly id: Provider;
  readonly label: string;
  readonly startUrl: string;
}

// Static catalog of providers the BC knows about. The runtime list is
// filtered against `bundle.availability` so providers without configured
// credentials are hidden from the frontend.
export const PROVIDER_CATALOG: readonly ProviderCatalogEntry[] = [
  { id: 'github', label: 'GitHub', startUrl: '/v1/auth/oauth/github/start' },
  { id: 'linkedin', label: 'LinkedIn', startUrl: '/v1/auth/oauth/linkedin/start' },
];

export function callbackUri(bundle: OAuthHttpBundle, provider: Provider): string {
  const base = bundle.config.get<string>('API_BASE_URL') ?? '';
  return `${base}/api/v1/auth/oauth/${provider}/callback`;
}

export function handleStart(bundle: OAuthHttpBundle, provider: Provider) {
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

export async function handleCallback(ctx: HttpCtx, bundle: OAuthHttpBundle, provider: Provider) {
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
