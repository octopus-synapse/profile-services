/**
 * Add To Group Use Case
 *
 * Adds a user to a group and publishes a domain event.
 */

import type { EventPublisherPort } from '@/shared-kernel';
import { GroupMembershipChangedEvent } from '../../../domain/events';
import type { IUserAuthorizationRepository } from '../../../domain/ports/authorization-repositories.port';

export interface AddToGroupParams {
  userId: string;
  groupId: string;
  assignedBy?: string;
  expiresAt?: Date;
}

export class AddToGroupUseCase {
  constructor(
    private readonly userAuthRepo: IUserAuthorizationRepository,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(params: AddToGroupParams): Promise<void> {
    await this.userAuthRepo.addToGroup(params.userId, params.groupId, {
      assignedBy: params.assignedBy,
      expiresAt: params.expiresAt,
    });

    this.eventPublisher.publish(
      new GroupMembershipChangedEvent(params.userId, {
        groupId: params.groupId,
        action: 'added',
      }),
    );
  }
}
