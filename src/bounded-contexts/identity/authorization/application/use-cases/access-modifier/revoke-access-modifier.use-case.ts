/**
 * Revoke Access Modifier — admin use case.
 *
 * Sets `revokedAt`/`revokedBy` on a still-active modifier. Idempotent:
 * revoking an already-revoked row is a no-op (no audit entry emitted).
 */

import type { LoggerPort } from '@/shared-kernel';
import { DomainException } from '@/shared-kernel/exceptions';
import type { AccessModifierId, UserId } from '../../../domain/entities/access-modifier.entity';
import type { IAccessModifierRepository } from '../../../domain/ports/access-modifier.port';
import type { AuditLogPort } from './apply-access-modifier.use-case';

export class AccessModifierNotFoundException extends DomainException {
  readonly code = 'ACCESS_MODIFIER_NOT_FOUND';
  readonly statusHint = 404;
  constructor(modifierId: string) {
    super(`AccessModifier ${modifierId} not found`);
  }
}

export class RevokeAccessModifierUseCase {
  constructor(
    private readonly repository: IAccessModifierRepository,
    private readonly auditLog: AuditLogPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(modifierId: AccessModifierId, revokedBy: UserId): Promise<void> {
    const modifier = await this.repository.findById(modifierId);
    if (!modifier) {
      throw new AccessModifierNotFoundException(modifierId);
    }
    if (modifier.revokedAt) {
      // Already revoked — idempotent no-op.
      return;
    }

    await this.repository.revoke(modifierId, revokedBy);

    await this.auditLog.log({
      userId: revokedBy,
      action: 'ACCESS_MODIFIER_REVOKED',
      entityType: 'AccessModifier',
      entityId: modifierId,
      metadata: {
        targetUserId: modifier.userId,
        modifierType: modifier.modifierType,
      },
    });

    this.logger.log(
      `Revoked AccessModifier ${modifierId} (user: ${modifier.userId})`,
      'RevokeAccessModifierUseCase',
    );
  }
}
