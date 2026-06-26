import type { FullUserPreferences } from '../../ports/user-preferences.port';
import { UserPreferencesRepositoryPort } from '../../ports/user-preferences.port';

export class GetFullPreferencesUseCase {
  constructor(private readonly repository: UserPreferencesRepositoryPort) {}

  async execute(userId: string): Promise<FullUserPreferences> {
    const preferences = await this.repository.findFullPreferences(userId);
    // Lazily materialise the defaults row for users who predate the
    // preferences table or never opened settings. `upsertFullPreferences`
    // owns the default values (DRY), so the GET response always satisfies
    // the full-preferences schema instead of returning an empty object that
    // breaks the client (e.g. the privacy tab spinning forever).
    return preferences ?? this.repository.upsertFullPreferences(userId, {});
  }
}
