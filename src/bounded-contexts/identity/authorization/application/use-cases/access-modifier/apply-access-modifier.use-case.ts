/**
 * Apply Access Modifier — admin use case.
 *
 * Records a new AccessModifier row that the permission gate will pick
 * up on the next request. Emits an audit-log entry.
 */

import { AuditLogPort } from '@/shared-kernel/audit';
import type { LoggerPort } from '@/shared-kernel/logger';
import type {
  AccessModifier,
  CreateAccessModifierInput,
} from '../../../domain/entities/access-modifier.entity';
import type { IAccessModifierRepository } from '../../../domain/ports/access-modifier.port';

// Re-exported for source-compat with existing adapter imports.
export { AuditLogPort };

export class ApplyAccessModifierUseCase {
  constructor(
    private readonly repository: IAccessModifierRepository,
    private readonly auditLog: AuditLogPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: CreateAccessModifierInput): Promise<AccessModifier> {
    const modifier = await this.repository.create(input);

    await this.auditLog.log({
      userId: input.createdBy,
      action: 'ACCESS_MODIFIER_APPLIED',
      entityType: 'AccessModifier',
      entityId: modifier.id,
      metadata: {
        targetUserId: input.userId,
        modifierType: input.modifierType,
        effect: input.effect,
        reason: input.reason,
        startsAt: (input.startsAt ?? new Date()).toISOString(),
        endsAt: input.endsAt ? input.endsAt.toISOString() : null,
        permissionId: input.permissionId ?? null,
      },
    });

    this.logger.log(
      `Applied ${input.effect} ${input.modifierType} to user ${input.userId} (reason: ${input.reason})`,
      'ApplyAccessModifierUseCase',
    );

    return modifier;
  }
}
