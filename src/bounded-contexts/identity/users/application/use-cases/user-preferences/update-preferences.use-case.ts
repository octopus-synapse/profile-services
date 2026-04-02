import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type {
  UpdatePreferencesData,
  UserPreferencesRepositoryPort,
} from '../../ports/user-preferences.port';

export class UpdatePreferencesUseCase {
  constructor(private readonly repository: UserPreferencesRepositoryPort) {}

  async execute(userId: string, data: UpdatePreferencesData): Promise<void> {
    const exists = await this.repository.userExists(userId);

    if (!exists) {
      throw new EntityNotFoundException('User');
    }

    await this.repository.updatePreferences(userId, data);
  }
}
