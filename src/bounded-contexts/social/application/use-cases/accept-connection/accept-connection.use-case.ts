import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import { ConnectionAcceptedEvent } from '../../../domain/events';
import type { ConnectionRepositoryPort, ConnectionWithUser } from '../../ports/connection.port';

export class AcceptConnectionUseCase {
  constructor(
    private readonly repository: ConnectionRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(connectionId: string, currentUserId: string): Promise<ConnectionWithUser> {
    const connection = await this.repository.findConnectionById(connectionId);
    if (!connection) {
      throw new NotFoundException('Connection request not found');
    }

    if (connection.status !== 'PENDING') {
      throw new BadRequestException('Connection request is not pending');
    }

    if (connection.targetId !== currentUserId) {
      throw new BadRequestException('Only the target user can accept a connection request');
    }

    const updated = await this.repository.updateConnectionStatus(connectionId, 'ACCEPTED');

    this.eventPublisher.publish(
      new ConnectionAcceptedEvent(connection.requesterId, {
        requesterId: connection.requesterId,
        targetId: connection.targetId,
      }),
    );

    return updated;
  }
}
