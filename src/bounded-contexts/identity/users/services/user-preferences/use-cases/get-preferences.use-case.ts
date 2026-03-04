import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type {
  UserPreferences,
  UserPreferencesRepositoryPort,
} from '../ports/user-preferences.port';

export class GetPreferencesUseCase {
  constructor(private readonly repository: UserPreferencesRepositoryPort) {}

  async execute(userId: string): Promise<UserPreferences> {
    const preferences = await this.repository.findPreferences(userId);

    if (!preferences) {
      throw new EntityNotFoundException('User');
    }

    return preferences;
  }
}
