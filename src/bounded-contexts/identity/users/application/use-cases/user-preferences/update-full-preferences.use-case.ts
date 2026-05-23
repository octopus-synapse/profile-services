import { AuditLogPort } from '@/shared-kernel/audit';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { LoggerPort } from '@/shared-kernel/logger';
import type {
  FullUserPreferences,
  UpdateFullPreferencesData,
} from '../../ports/user-preferences.port';
import { UserPreferencesRepositoryPort } from '../../ports/user-preferences.port';

/**
 * Updates the full preferences shape (notifications, privacy, apply
 * mode, apply criteria, etc). Emits `USER_FULL_PREFERENCES_UPDATED`
 * audit per Q50.
 */
export class UpdateFullPreferencesUseCase {
  constructor(
    private readonly repository: UserPreferencesRepositoryPort,
    private readonly auditLog: AuditLogPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(userId: string, data: UpdateFullPreferencesData): Promise<FullUserPreferences> {
    const exists = await this.repository.userExists(userId);

    if (!exists) {
      throw new EntityNotFoundException('User');
    }

    const result = await this.repository.upsertFullPreferences(userId, data);

    await this.auditLog.log({
      userId,
      action: 'PREFERENCES_UPDATED',
      entityType: 'UserPreferences',
      entityId: userId,
      metadata: {
        fields: Object.keys(data).filter((k) => k !== 'applyCriteria'),
        criteriaUpdated: data.applyCriteria ? Object.keys(data.applyCriteria) : [],
      },
    });

    this.logger.log(`Full preferences updated for user ${userId}`, 'UpdateFullPreferencesUseCase');

    return result;
  }
}
