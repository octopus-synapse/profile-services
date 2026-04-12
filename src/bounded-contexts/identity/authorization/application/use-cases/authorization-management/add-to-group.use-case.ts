/**
 * Add To Group Use Case
 *
 * Adds a user to a group and publishes a domain event.
 */

import type { EventPublisherPort } from '@/shared-kernel';
import { GroupMembershipChangedEvent } from '../../../domain/events';
import type { UserAuthorizationRepository } from '../../../infrastructure/repositories/user-authorization.repository';

export interface AddToGroupParams {
  userId: string;
  groupId: string;
  assignedBy?: string;
  expiresAt?: Date;
}

export class AddToGroupUseCase {
  constructor(
    private readonly userAuthRepo: UserAuthorizationRepository,
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
