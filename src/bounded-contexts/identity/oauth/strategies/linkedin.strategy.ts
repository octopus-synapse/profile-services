import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
// passport-linkedin-oauth2 ships its own types but they're looser than
// passport-github2 — we read conservatively from the `Profile` shape.
import { type Profile, Strategy } from 'passport-linkedin-oauth2';
import type { OAuthProfile } from '../services/oauth.service';

@Injectable()
export class LinkedinOAuthStrategy extends PassportStrategy(Strategy, 'linkedin') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('LINKEDIN_CLIENT_ID') ?? 'unset',
      clientSecret: config.get<string>('LINKEDIN_CLIENT_SECRET') ?? 'unset',
      callbackURL: `${config.get<string>('OAUTH_CALLBACK_BASE') ?? ''}/api/v1/auth/oauth/linkedin/callback`,
      scope: ['r_liteprofile', 'r_emailaddress'],
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
    done(null, {
      provider: 'linkedin',
      providerAccountId: String(profile.id),
      email,
      displayName: profile.displayName ?? null,
      photoURL,
      accessToken,
      refreshToken: refreshToken ?? null,
      raw: (profile as unknown as { _json?: Record<string, unknown> })._json ?? {},
    });
  }
}
