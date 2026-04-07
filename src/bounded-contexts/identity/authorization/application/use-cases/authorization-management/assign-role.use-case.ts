/**
 * Assign Role Use Case
 *
 * Assigns a role to a user and publishes a domain event.
 */

import type { EventPublisherPort } from '@/shared-kernel';
import { RoleAssignedEvent } from '../../../domain/events';
import type { UserAuthorizationRepository } from '../../../infrastructure/repositories/user-authorization.repository';

export interface AssignRoleParams {
  userId: string;
  roleId: string;
  assignedBy?: string;
  expiresAt?: Date;
}

export class AssignRoleUseCase {
  constructor(
    private readonly userAuthRepo: UserAuthorizationRepository,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(params: AssignRoleParams): Promise<void> {
    await this.userAuthRepo.assignRole(params.userId, params.roleId, {
      assignedBy: params.assignedBy,
      expiresAt: params.expiresAt,
    });

    this.eventPublisher.publish(
      new RoleAssignedEvent(params.userId, {
        roleId: params.roleId,
        assignedBy: params.assignedBy ?? 'system',
      }),
    );
  }
}
