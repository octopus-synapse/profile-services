import type { OneClickApplyConfig } from '../../ports/user-preferences.port';
import { UserPreferencesRepositoryPort } from '../../ports/user-preferences.port';

/**
 * Returns the caller's One-Click Apply config or `null` if never saved.
 * Frontend renders default values from `useFormDraft` when null.
 */
export class GetOneClickApplyConfigUseCase {
  constructor(private readonly repository: UserPreferencesRepositoryPort) {}

  execute(userId: string): Promise<OneClickApplyConfig | null> {
    return this.repository.findOneClickApplyConfig(userId);
  }
}
