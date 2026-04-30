import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type {
  FullUserPreferences,
  UpdateFullPreferencesData,
} from '../../ports/user-preferences.port';
import { UserPreferencesRepositoryPort } from '../../ports/user-preferences.port';

export class UpdateFullPreferencesUseCase {
  constructor(private readonly repository: UserPreferencesRepositoryPort) {}

  async execute(userId: string, data: UpdateFullPreferencesData): Promise<FullUserPreferences> {
    const exists = await this.repository.userExists(userId);

    if (!exists) {
      throw new EntityNotFoundException('User');
    }

    return this.repository.upsertFullPreferences(userId, data);
  }
}
