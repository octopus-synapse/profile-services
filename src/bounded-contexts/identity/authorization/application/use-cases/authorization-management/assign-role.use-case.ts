/**
 * Assign Role Use Case
 *
 * Assigns a role to a user and publishes a domain event.
 */

import type { EventPublisherPort } from '@/shared-kernel';
import { RoleAssignedEvent } from '../../../domain/events';
import type { IUserAuthorizationRepository } from '../../../domain/ports/authorization-repositories.port';

export interface AssignRoleParams {
  userId: string;
  roleId: string;
  assignedBy?: string;
  expiresAt?: Date;
}

export class AssignRoleUseCase {
  constructor(
    private readonly userAuthRepo: IUserAuthorizationRepository,
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
