/**
 * Deny Permission Use Case
 *
 * Denies a permission to a user and publishes a domain event.
 */

import { EventPublisherPort } from '@/shared-kernel';
import { PermissionDeniedEvent } from '../../../domain/events';
import type { IUserAuthorizationRepository } from '../../../domain/ports/authorization-repositories.port';

export interface DenyPermissionParams {
  userId: string;
  permissionId: string;
  deniedBy?: string;
  reason?: string;
}

export class DenyPermissionUseCase {
  constructor(
    private readonly userAuthRepo: IUserAuthorizationRepository,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(params: DenyPermissionParams): Promise<void> {
    await this.userAuthRepo.denyPermission(params.userId, params.permissionId, {
      assignedBy: params.deniedBy,
      reason: params.reason,
    });

    this.eventPublisher.publish(
      new PermissionDeniedEvent(params.userId, {
        permissionId: params.permissionId,
        deniedBy: params.deniedBy ?? 'system',
        reason: params.reason ?? 'explicit denial',
      }),
    );
  }
}
