/**
 * Revoke Role Use Case
 *
 * Revokes a role from a user and publishes a domain event.
 */

import type { EventPublisherPort } from '@/shared-kernel';
import { RoleRevokedEvent } from '../../../domain/events';
import type { IUserAuthorizationRepository } from '../../../domain/ports/authorization-repositories.port';

export interface RevokeRoleParams {
  userId: string;
  roleId: string;
  revokedBy?: string;
  reason?: string;
}

export class RevokeRoleUseCase {
  constructor(
    private readonly userAuthRepo: IUserAuthorizationRepository,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(params: RevokeRoleParams): Promise<void> {
    await this.userAuthRepo.revokeRole(params.userId, params.roleId);

    this.eventPublisher.publish(
      new RoleRevokedEvent(params.userId, {
        roleId: params.roleId,
        revokedBy: params.revokedBy ?? 'system',
        reason: params.reason ?? 'manual revocation',
      }),
    );
  }
}
