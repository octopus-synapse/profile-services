/**
 * `OAuthProviderConfigPort` adapter that reads the per-provider
 * client-id/secret from `ConfigService`. A provider is "available"
 * iff both env vars are set.
 */

import { ConfigPort } from '@/shared-kernel/config';
import type { OAuthProvider } from '../../../domain/entities/oauth-profile';
import { OAuthProviderConfigPort } from '../../../domain/ports/oauth-provider-config.port';

export class ConfigServiceOAuthProviderConfig extends OAuthProviderConfigPort {
  constructor(private readonly config: ConfigPort) {
    super();
  }

  hasProvider(provider: OAuthProvider): boolean {
    const id = this.config.get<string>(`${provider.toUpperCase()}_CLIENT_ID`);
    const secret = this.config.get<string>(`${provider.toUpperCase()}_CLIENT_SECRET`);
    return Boolean(id && secret);
  }
}
