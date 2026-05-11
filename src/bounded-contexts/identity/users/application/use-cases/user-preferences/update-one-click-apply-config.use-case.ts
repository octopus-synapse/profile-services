import type { OneClickApplyConfig } from '../../ports/user-preferences.port';
import { UserPreferencesRepositoryPort } from '../../ports/user-preferences.port';

/**
 * Persists the caller's One-Click Apply config. The Json blob is
 * validated by Zod at the route layer; this use case treats it as
 * opaque persistence.
 */
export class UpdateOneClickApplyConfigUseCase {
  constructor(private readonly repository: UserPreferencesRepositoryPort) {}

  execute(userId: string, config: OneClickApplyConfig): Promise<OneClickApplyConfig> {
    return this.repository.upsertOneClickApplyConfig(userId, config);
  }
}
