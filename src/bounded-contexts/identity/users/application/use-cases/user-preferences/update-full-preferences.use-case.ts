import { AuditLogPort } from '@/shared-kernel/audit';
import { EntityNotFoundException, ValidationException } from '@/shared-kernel/exceptions';
import type { LoggerPort } from '@/shared-kernel/logger';
import { normalizeLocale } from '@/shared-kernel/utils/locale-resolver.util';
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

  async execute(userId: string, input: UpdateFullPreferencesData): Promise<FullUserPreferences> {
    const exists = await this.repository.userExists(userId);

    if (!exists) {
      throw new EntityNotFoundException('User');
    }

    const data = withCanonicalLanguage(input);
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

/**
 * `UserPreferences.language` is the UI locale and is stored as a free
 * string, so `pt_BR` / `PT-br` / `en-US` all used to land verbatim and no
 * locale-aware read recognised them. Canonicalise at the write boundary
 * (ADR-003 §11 vocabulary: `pt-BR` / `en`); a string that names no served
 * locale is a client error, not something to guess at.
 */
function withCanonicalLanguage(data: UpdateFullPreferencesData): UpdateFullPreferencesData {
  if (data.language === undefined) return data;
  const language = normalizeLocale(data.language);
  if (!language) {
    throw new ValidationException(`Unsupported language "${data.language}"`, {
      language: ['unsupported'],
    });
  }
  return { ...data, language };
}
