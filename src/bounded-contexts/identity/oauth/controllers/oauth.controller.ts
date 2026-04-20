import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Req,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure/decorators/public.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { type OAuthProfile, OAuthService } from '../services/oauth.service';

type Provider = 'github' | 'linkedin';

@SdkExport({ tag: 'auth', description: 'OAuth login endpoints' })
@ApiTags('auth-oauth')
@Controller('v1/auth/oauth')
export class OAuthController {
  constructor(
    private readonly oauth: OAuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get('github/start')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Start GitHub OAuth sign-in.' })
  githubStart() {
    // AuthGuard redirects to GitHub — nothing to return.
  }

  @Public()
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'GitHub OAuth callback.' })
  async githubCallback(
    @Req() req: Request & { user?: OAuthProfile },
    @Res() res: Response,
  ): Promise<void> {
    await this.handleCallback('github', req, res);
  }

  @Public()
  @Get('linkedin/start')
  @UseGuards(AuthGuard('linkedin'))
  @ApiOperation({ summary: 'Start LinkedIn OAuth sign-in.' })
  linkedinStart() {
    // AuthGuard redirects.
  }

  @Public()
  @Get('linkedin/callback')
  @UseGuards(AuthGuard('linkedin'))
  @ApiOperation({ summary: 'LinkedIn OAuth callback.' })
  async linkedinCallback(
    @Req() req: Request & { user?: OAuthProfile },
    @Res() res: Response,
  ): Promise<void> {
    await this.handleCallback('linkedin', req, res);
  }

  /** Lightweight check for the UI: "can I show the GitHub/LinkedIn buttons?" */
  @Public()
  @Get('available/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Whether a given OAuth provider is configured.' })
  @ApiParam({ name: 'provider', enum: ['github', 'linkedin'] })
  available(@Param('provider') provider: Provider): { available: boolean } {
    return { available: this.oauth.hasProvider(provider) };
  }

  // ---- internal ----

  private async handleCallback(
    provider: Provider,
    req: Request & { user?: OAuthProfile },
    res: Response,
  ): Promise<void> {
    if (!this.oauth.hasProvider(provider)) {
      throw new ServiceUnavailableException(`${provider} OAuth is not configured`);
    }
    if (!req.user) {
      throw new ServiceUnavailableException('OAuth did not return a profile');
    }

    const { userId, created } = await this.oauth.upsertFromProfile(req.user);

    // Handoff to the UI. The frontend `/auth/oauth-complete` route picks up
    // the userId + marker and calls our create-session endpoint (which sets
    // the httpOnly cookie). Keeping this controller session-agnostic avoids
    // duplicating the JWT/cookie logic that already lives in Authentication.
    //
    // We also forward the verified email and (for github) the external
    // username so the UI can immediately probe for a pre-built shadow
    // profile and offer to claim it.
    const base = this.config.get<string>('UI_BASE_URL') ?? '';
    const params = new URLSearchParams({
      provider,
      userId,
      created: String(created),
    });
    if (req.user.email) params.set('email', req.user.email);
    const externalLogin = (req.user.raw as { login?: unknown } | null)?.login;
    if (provider === 'github' && typeof externalLogin === 'string') {
      params.set('githubLogin', externalLogin);
    }
    res.redirect(`${base}/auth/oauth-complete?${params.toString()}`);
  }
}
