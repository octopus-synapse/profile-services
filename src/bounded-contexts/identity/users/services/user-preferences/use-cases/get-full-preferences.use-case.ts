import type {
  FullUserPreferences,
  UserPreferencesRepositoryPort,
} from '../ports/user-preferences.port';

export class GetFullPreferencesUseCase {
  constructor(private readonly repository: UserPreferencesRepositoryPort) {}

  async execute(userId: string): Promise<FullUserPreferences | Record<string, never>> {
    const preferences = await this.repository.findFullPreferences(userId);
    return preferences ?? {};
  }
}
