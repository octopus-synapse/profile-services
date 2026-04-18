/**
 * Remove From Group Use Case
 *
 * Removes a user from a group and publishes a domain event.
 */

import { EventPublisherPort } from '@/shared-kernel';
import { GroupMembershipChangedEvent } from '../../../domain/events';
import type { IUserAuthorizationRepository } from '../../../domain/ports/authorization-repositories.port';

export class RemoveFromGroupUseCase {
  constructor(
    private readonly userAuthRepo: IUserAuthorizationRepository,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(userId: string, groupId: string): Promise<void> {
    await this.userAuthRepo.removeFromGroup(userId, groupId);

    this.eventPublisher.publish(
      new GroupMembershipChangedEvent(userId, {
        groupId,
        action: 'removed',
      }),
    );
  }
}
