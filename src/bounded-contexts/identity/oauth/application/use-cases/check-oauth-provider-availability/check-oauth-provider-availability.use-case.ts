import type { OAuthProvider } from '../../../domain/entities/oauth-profile';
import { OAuthProviderConfigPort } from '../../../domain/ports/oauth-provider-config.port';

export class CheckOAuthProviderAvailabilityUseCase {
  constructor(private readonly config: OAuthProviderConfigPort) {}

  execute(provider: OAuthProvider): { available: boolean } {
    return { available: this.config.hasProvider(provider) };
  }
}
