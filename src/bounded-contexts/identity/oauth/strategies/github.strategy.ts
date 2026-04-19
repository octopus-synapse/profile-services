import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { type Profile, Strategy } from 'passport-github2';
import type { OAuthProfile } from '../services/oauth.service';

/**
 * GitHub OAuth 2.0 strategy. Scope `read:user user:email` is enough for
 * profile bootstrap; the import use-case re-uses the same token to reach
 * `repos`, languages, stars via @octokit/graphql.
 */
@Injectable()
export class GithubOAuthStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GITHUB_CLIENT_ID') ?? 'unset',
      clientSecret: config.get<string>('GITHUB_CLIENT_SECRET') ?? 'unset',
      callbackURL: `${config.get<string>('OAUTH_CALLBACK_BASE') ?? ''}/api/v1/auth/oauth/github/callback`,
      scope: ['read:user', 'user:email', 'repo'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string | undefined,
    profile: Profile,
    done: (error: Error | null, user?: OAuthProfile) => void,
  ): void {
    const email = profile.emails?.[0]?.value ?? null;
    const photoURL = profile.photos?.[0]?.value ?? null;
    // passport-github2's `Profile` ships typed fields plus a `_json` raw
    // payload which isn't in the .d.ts. We cast narrowly so the import
    // use-case can still dig into company/bio later via `raw`.
    const raw = (profile as unknown as { _json?: Record<string, unknown> })._json ?? {};
    done(null, {
      provider: 'github',
      providerAccountId: String(profile.id),
      email,
      displayName: profile.displayName ?? profile.username ?? null,
      photoURL,
      accessToken,
      refreshToken: refreshToken ?? null,
      raw,
    });
  }
}
