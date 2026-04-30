import { describe, expect, it } from 'bun:test';
import { InMemoryOAuthProviderConfig } from '../../../testing';
import { CheckOAuthProviderAvailabilityUseCase } from './check-oauth-provider-availability.use-case';

describe('CheckOAuthProviderAvailabilityUseCase', () => {
  it('reflects whatever the config port reports', () => {
    const config = new InMemoryOAuthProviderConfig();
    config.setProvider('github', true);
    config.setProvider('linkedin', false);
    const useCase = new CheckOAuthProviderAvailabilityUseCase(config);

    expect(useCase.execute('github')).toEqual({ available: true });
    expect(useCase.execute('linkedin')).toEqual({ available: false });
  });
});
