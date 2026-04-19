/**
 * Grant Permission Use Case
 *
 * Grants a direct permission to a user and publishes a domain event.
 */

import type { EventPublisherPort } from '@/shared-kernel';
import { PermissionGrantedEvent } from '../../../domain/events';
import type { IUserAuthorizationRepository } from '../../../domain/ports/authorization-repositories.port';

export interface GrantPermissionParams {
  userId: string;
  permissionId: string;
  assignedBy?: string;
  expiresAt?: Date;
  reason?: string;
}

export class GrantPermissionUseCase {
  constructor(
    private readonly userAuthRepo: IUserAuthorizationRepository,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(params: GrantPermissionParams): Promise<void> {
    await this.userAuthRepo.grantPermission(params.userId, params.permissionId, {
      assignedBy: params.assignedBy,
      expiresAt: params.expiresAt,
      reason: params.reason,
    });

    this.eventPublisher.publish(
      new PermissionGrantedEvent(params.userId, {
        permissionId: params.permissionId,
        grantedBy: params.assignedBy ?? 'system',
      }),
    );
  }
}
