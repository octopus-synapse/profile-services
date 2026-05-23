/**
 * OAuth route descriptors. The four `{github,linkedin}/{start,callback}`
 * endpoints use `OAuthPort` (`FetchOAuthAdapter`) directly — the Nest
 * Passport strategies were dropped in F5.H. `start` redirects to the
 * provider's authorize URL; `callback` exchanges the code for a profile,
 * upserts the user, and redirects to the UI. Both are `kind: 'redirect'`
 * so the SDK skips them and the swagger generator emits 302 responses.
 *
 * V2 D41: `start` and `callback` accept an optional `redirect_uri`
 * query param. When supplied **and** validated against
 * `bundle.redirectUriAllowlist`, the callback redirects to that URI
 * with `provider`/`userId`/`created` (and email/githubLogin when
 * available) so a native client can finish the flow over a deep link.
 * When absent, the legacy `UI_BASE_URL`-rooted redirect runs unchanged.
 *
 * Token issuance on the dynamic-redirect path stays a TODO until the
 * Elysia-side OAuth strategy plumbing lands. See the v2 plan PR for the
 * follow-up that wires `TokenGeneratorPort` through the bundle so tokens
 * can ride in the deep-link query string.
 */

import { randomBytes } from 'node:crypto';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { signState, verifyState } from '@/shared-kernel/auth';
import { isRedirectUriAllowed } from '@/shared-kernel/auth/redirect-uri-allowlist';
import type { HttpCtx } from '@/shared-kernel/http/context';
import { stageClearCookie, stageSetCookie } from '@/shared-kernel/http/cookie-jar';
import { withRedirect } from '@/shared-kernel/http/route.types';
import type { OAuthHttpBundle } from './application/ports/oauth-http.bundle';
import { OAuthStateMismatchException } from './domain/exceptions/oauth.exceptions';

/** Cookie name for the signed OAuth `state` parameter (one per provider). */
function stateCookieName(provider: Provider): string {
  return `oauth_state_${provider}`;
}

/** TTL for the OAuth state cookie. The IdP redirect dance should complete in
 *  well under 10 minutes; cookies older than this are rejected. */
const STATE_TTL_MS = 10 * 60 * 1000;

extendZodWithOpenApi(z);

export const ProviderParam = z
  .object({ provider: z.enum(['github', 'linkedin']) })
  .openapi({ example: { provider: 'github' } });

// ─── Query schemas (V2 D41) ──────────────────────────────────────────
export const StartQuerySchema = z
  .object({
    redirect_uri: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
  })
  .passthrough();

export const CallbackQuerySchema = z
  .object({
    redirect_uri: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    code: z.string().optional(),
  })
  .passthrough();

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

/**
 * V2 D41: Reads the `redirect_uri` from query string and validates it
 * against the configured allowlist. Returns:
 *  - `{ ok: true, uri }` when present + allowed
 *  - `{ ok: true, uri: null }` when absent (fall back to legacy flow)
 *  - `{ ok: false, reason }` when present + rejected
 */
export function validateRedirectUriFromQuery(
  query: Record<string, unknown>,
  allowlist: readonly string[],
): { ok: true; uri: string | null } | { ok: false; reason: string } {
  const raw = query.redirect_uri;
  if (raw === undefined || raw === null || raw === '') {
    return { ok: true, uri: null };
  }
  if (typeof raw !== 'string') {
    return { ok: false, reason: 'redirect_uri must be a string' };
  }
  if (allowlist.length === 0) {
    return { ok: false, reason: 'redirect_uri rejected: allowlist is empty' };
  }
  if (!isRedirectUriAllowed(raw, allowlist)) {
    return { ok: false, reason: 'redirect_uri rejected: not in allowlist' };
  }
  return { ok: true, uri: raw };
}

export function handleStart(ctx: HttpCtx, bundle: OAuthHttpBundle, provider: Provider) {
  if (!bundle.availability.execute(provider).available) {
    throw new Error(`${provider} OAuth is not configured`);
  }

  // V2 D41: validate any client-supplied `redirect_uri` up-front so a
  // misconfigured client gets a clear 400 instead of a silent fallthrough
  // to the cookie-based web flow on callback.
  const queryAsObj = ctx.query as Record<string, unknown>;
  const validation = validateRedirectUriFromQuery(queryAsObj, bundle.redirectUriAllowlist);
  if (!validation.ok) {
    const err = new Error(validation.reason) as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  const state = randomBytes(16).toString('hex');

  // Persist the state via a signed, short-lived, httpOnly cookie. The IdP
  // echoes `state` back on callback; the callback handler enforces that the
  // echoed value matches what we signed here (prevents login-CSRF).
  const secret = bundle.config.get<string>('JWT_SECRET');
  if (!secret) throw new Error('JWT_SECRET is required to sign OAuth state cookie');
  const signed = signState(state, secret);
  stageSetCookie(ctx, stateCookieName(provider), signed, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_TTL_MS,
  });

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
  const incomingState = (ctx.query as { state?: string }).state;
  if (!code) throw new Error('OAuth callback missing code');

  // Verify the signed state cookie matches the IdP-echoed `state`. The cookie
  // is set on `/start`; without it (or with mismatch / expired signature) the
  // request is rejected to block login-CSRF.
  const secret = bundle.config.get<string>('JWT_SECRET');
  if (!secret) throw new Error('JWT_SECRET is required to verify OAuth state cookie');
  const cookieName = stateCookieName(provider);
  const cookieValue = ctx.cookies[cookieName];
  const expectedState = verifyState(cookieValue, { secret, ttlMs: STATE_TTL_MS });
  if (!expectedState || !incomingState || expectedState !== incomingState) {
    // Clear the cookie regardless — even a malformed one shouldn't linger.
    stageClearCookie(ctx, cookieName, { path: '/' });
    throw new OAuthStateMismatchException();
  }
  // Single-use: clear the cookie after a successful match so replay attempts
  // can't reuse it.
  stageClearCookie(ctx, cookieName, { path: '/' });

  const portProfile = await bundle.oauth.exchangeCode(provider, {
    code,
    redirectUri: callbackUri(bundle, provider),
    state: incomingState,
  });

  // Bridge between the framework-free `OAuthPort.OAuthProfile` (port shape)
  // and the BC's domain `OAuthProfile` (carries the upsert-relevant fields).
  const profile = {
    provider,
    providerAccountId: portProfile.providerId,
    email: portProfile.email,
    emailVerified: portProfile.emailVerified,
    displayName: portProfile.displayName,
    photoURL: portProfile.avatarUrl,
    accessToken: portProfile.accessToken,
    refreshToken: portProfile.refreshToken,
    raw: portProfile.raw,
  };

  const { userId, created } = await bundle.upsert.execute(profile);

  // V2 D41: resolve the redirect target — dynamic mode (mobile deep link)
  // when `redirect_uri` was supplied + validated, otherwise the legacy
  // `UI_BASE_URL`-rooted `/auth/oauth-complete` redirect.
  const queryAsObj = ctx.query as Record<string, unknown>;
  const validation = validateRedirectUriFromQuery(queryAsObj, bundle.redirectUriAllowlist);
  if (!validation.ok) {
    // Surface as a 400 — the start endpoint also validates, so reaching
    // here means the client tampered with the query mid-flow.
    const err = new Error(validation.reason) as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  const base =
    validation.uri ?? `${bundle.config.get<string>('UI_BASE_URL') ?? ''}/auth/oauth-complete`;
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
  // TODO(v2-mobile): once the Elysia OAuth strategy is fully wired,
  // generate a token pair here (via a `TokenGeneratorPort` added to the
  // bundle) and append `accessToken`/`refreshToken`/`expiresIn` to the
  // deep-link query so the native client can hydrate session state
  // without a follow-up POST.
  const separator = base.includes('?') ? '&' : '?';
  return withRedirect(`${base}${separator}${params.toString()}`);
}
