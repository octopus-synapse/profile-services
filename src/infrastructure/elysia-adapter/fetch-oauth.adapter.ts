/**
 * `OAuthPort` impl using direct `fetch` calls — no plugin dependency
 * yet. Covers Google, LinkedIn, GitHub. The full flow is small enough
 * that a framework-agnostic adapter is simpler than wiring a plugin
 * per provider.
 *
 * Configure each provider via `FetchOAuthConfig`. The bootstrap reads
 * client id/secret from `ConfigPort` and instantiates one adapter per
 * provider it actually supports.
 */

import {
  type OAuthAuthorizeOptions,
  type OAuthCodeExchangeInput,
  OAuthPort,
  type OAuthProfile,
  type OAuthProvider,
} from '@/shared-kernel/auth/oauth.port';

// P2-#29: hard ceiling for upstream OAuth fetches. 10s comfortably
// exceeds the p99 of Google/LinkedIn/GitHub OAuth endpoints; anything
// past that is a sign the provider is degraded and we should fail
// rather than block an Elysia worker.
const OAUTH_FETCH_TIMEOUT_MS = 10_000;

interface ProviderConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly authorizeUrl: string;
  readonly tokenUrl: string;
  readonly profileUrl: string;
  readonly defaultScopes: readonly string[];
}

export interface FetchOAuthConfig {
  readonly google?: { clientId: string; clientSecret: string };
  readonly linkedin?: { clientId: string; clientSecret: string };
  readonly github?: { clientId: string; clientSecret: string };
}

const PROVIDERS: Record<OAuthProvider, Omit<ProviderConfig, 'clientId' | 'clientSecret'>> = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    profileUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    defaultScopes: ['openid', 'email', 'profile'],
  },
  linkedin: {
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    profileUrl: 'https://api.linkedin.com/v2/userinfo',
    defaultScopes: ['openid', 'email', 'profile'],
  },
  github: {
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    profileUrl: 'https://api.github.com/user',
    defaultScopes: ['read:user', 'user:email'],
  },
};

export class FetchOAuthAdapter extends OAuthPort {
  constructor(private readonly config: FetchOAuthConfig) {
    super();
  }

  private resolve(provider: OAuthProvider): ProviderConfig {
    const tpl = PROVIDERS[provider];
    const creds = this.config[provider];
    if (!creds) throw new Error(`OAuth provider not configured: ${provider}`);
    return { ...tpl, clientId: creds.clientId, clientSecret: creds.clientSecret };
  }

  buildAuthorizeUrl(provider: OAuthProvider, options: OAuthAuthorizeOptions): string {
    const cfg = this.resolve(provider);
    const params = new URLSearchParams({
      client_id: cfg.clientId,
      response_type: 'code',
      redirect_uri: options.redirectUri,
      scope: (options.scopes ?? cfg.defaultScopes).join(' '),
      state: options.state,
    });
    return `${cfg.authorizeUrl}?${params.toString()}`;
  }

  async exchangeCode(
    provider: OAuthProvider,
    input: OAuthCodeExchangeInput,
  ): Promise<OAuthProfile> {
    const cfg = this.resolve(provider);
    // P2-#29: cap the upstream call so a sluggish OAuth provider can't
    // tie up an Elysia worker for minutes. 10s is comfortably above the
    // p99 of every supported provider; anything beyond is a sign we
    // should fail fast and let the user retry.
    const tokenRes = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: input.code,
        redirect_uri: input.redirectUri,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
      }).toString(),
      signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS),
    });
    if (!tokenRes.ok) {
      // P2-#29: the previous error string smuggled the body (and thus
      // potentially `client_secret`) through call sites that logged
      // `.message`. Read+discard the body deliberately and only carry
      // the status code so nothing sensitive leaks.
      throw new Error(`OAuth token exchange failed: ${tokenRes.status}`);
    }
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
    };
    const accessToken = tokenJson.access_token;
    if (!accessToken) throw new Error('OAuth token response missing access_token');

    const profileRes = await fetch(cfg.profileUrl, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS),
    });
    if (!profileRes.ok) throw new Error(`OAuth profile fetch failed: ${profileRes.status}`);
    const raw = (await profileRes.json()) as Record<string, unknown>;

    // GitHub's `/user` endpoint omits non-public emails and never carries a
    // verification flag. We must call `/user/emails` and find the primary +
    // verified entry; without this any user who registers a GitHub account
    // claiming the victim's email could squat-link to their account.
    let githubVerifiedEmail: { email: string; verified: boolean } | null = null;
    if (provider === 'github') {
      githubVerifiedEmail = await this.fetchGithubPrimaryVerifiedEmail(accessToken);
    }

    return normalizeProfile(
      provider,
      raw,
      accessToken,
      tokenJson.refresh_token ?? null,
      githubVerifiedEmail,
    );
  }

  /**
   * GET `/user/emails` and return the primary, verified entry (or null).
   * Per GitHub docs the response is an array; we pick the entry with
   * `primary: true && verified: true`.
   */
  private async fetchGithubPrimaryVerifiedEmail(
    accessToken: string,
  ): Promise<{ email: string; verified: boolean } | null> {
    const res = await fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Array<{
      email?: string;
      primary?: boolean;
      verified?: boolean;
    }>;
    const primary = body.find((e) => e.primary === true);
    if (!primary || typeof primary.email !== 'string') return null;
    return { email: primary.email, verified: primary.verified === true };
  }
}

function normalizeProfile(
  provider: OAuthProvider,
  raw: Record<string, unknown>,
  accessToken: string,
  refreshToken: string | null,
  githubVerifiedEmail: { email: string; verified: boolean } | null = null,
): OAuthProfile {
  const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
  switch (provider) {
    case 'google': {
      return {
        providerId: String(raw.sub ?? ''),
        email: str(raw.email),
        emailVerified: Boolean(raw.email_verified),
        displayName: str(raw.name),
        avatarUrl: str(raw.picture),
        accessToken,
        refreshToken,
        raw,
      };
    }
    case 'linkedin': {
      return {
        providerId: String(raw.sub ?? ''),
        email: str(raw.email),
        emailVerified: Boolean(raw.email_verified),
        displayName: str(raw.name),
        avatarUrl: str(raw.picture),
        accessToken,
        refreshToken,
        raw,
      };
    }
    case 'github': {
      // Prefer the explicitly-verified primary email; fall back to `raw.email`
      // (always unverified) only when `/user/emails` returned nothing.
      const email = githubVerifiedEmail?.email ?? str(raw.email);
      const emailVerified = githubVerifiedEmail?.verified === true;
      return {
        providerId: String(raw.id ?? ''),
        email,
        emailVerified,
        displayName: str(raw.name) ?? str(raw.login),
        avatarUrl: str(raw.avatar_url),
        accessToken,
        refreshToken,
        raw,
      };
    }
  }
}
