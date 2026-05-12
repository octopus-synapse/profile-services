import { AuditLogPort } from '@/shared-kernel/audit';
import type { LoggerPort } from '@/shared-kernel/logger';
import type { OneClickApplyConfig } from '../../ports/user-preferences.port';
import { UserPreferencesRepositoryPort } from '../../ports/user-preferences.port';

/**
 * Persists the caller's One-Click Apply config. The Json blob is
 * validated by Zod at the route layer; this use case treats it as
 * opaque persistence.
 *
 * Emits `PREFERENCES_UPDATED` audit event per CLAUDE.md
 * Q50 (LGPD/GDPR requires audit on user-preference mutations).
 */
export class UpdateOneClickApplyConfigUseCase {
  constructor(
    private readonly repository: UserPreferencesRepositoryPort,
    private readonly auditLog: AuditLogPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(userId: string, config: OneClickApplyConfig): Promise<OneClickApplyConfig> {
    const saved = await this.repository.upsertOneClickApplyConfig(userId, config);

    await this.auditLog.log({
      userId,
      action: 'PREFERENCES_UPDATED',
      entityType: 'UserPreferences',
      entityId: userId,
      metadata: {
        enabled: config.enabled,
        resumeId: config.resumeId,
        tailoringMode: config.tailoringMode,
        attachGithubUrl: config.alsoAttach.githubUrl,
        attachLinkedinUrl: config.alsoAttach.linkedinUrl,
      },
    });

    this.logger.log(
      `One-click-apply config updated for user ${userId}`,
      'UpdateOneClickApplyConfigUseCase',
    );

    return saved;
  }
}
