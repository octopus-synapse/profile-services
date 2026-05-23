import { AuditLogPort } from '@/shared-kernel/audit';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { LoggerPort } from '@/shared-kernel/logger';
import type { UpdatePreferencesData } from '../../ports/user-preferences.port';
import { UserPreferencesRepositoryPort } from '../../ports/user-preferences.port';

/**
 * Updates the basic user-preferences row (palette, bannerColor, name,
 * photoURL). Emits `PREFERENCES_UPDATED` audit per Q50.
 */
export class UpdatePreferencesUseCase {
  constructor(
    private readonly repository: UserPreferencesRepositoryPort,
    private readonly auditLog: AuditLogPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(userId: string, data: UpdatePreferencesData): Promise<void> {
    const exists = await this.repository.userExists(userId);

    if (!exists) {
      throw new EntityNotFoundException('User');
    }

    await this.repository.updatePreferences(userId, data);

    await this.auditLog.log({
      userId,
      action: 'PREFERENCES_UPDATED',
      entityType: 'UserPreferences',
      entityId: userId,
      metadata: { fields: Object.keys(data) },
    });

    this.logger.log(
      `Preferences updated for user ${userId} (fields: ${Object.keys(data).join(', ')})`,
      'UpdatePreferencesUseCase',
    );
  }
}
