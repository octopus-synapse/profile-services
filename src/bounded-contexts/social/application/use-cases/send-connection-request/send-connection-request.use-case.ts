import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import { ConnectionRequestedEvent } from '../../../domain/events';
import type { ConnectionRepositoryPort, ConnectionWithUser } from '../../ports/connection.port';

export class SendConnectionRequestUseCase {
  constructor(
    private readonly repository: ConnectionRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(requesterId: string, targetId: string): Promise<ConnectionWithUser> {
    if (requesterId === targetId) {
      throw new BadRequestException('Cannot connect with yourself');
    }

    const targetExists = await this.repository.userExists(targetId);
    if (!targetExists) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.repository.findConnectionBetween(requesterId, targetId);
    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new ConflictException('Already connected with this user');
      }
      if (existing.status === 'PENDING') {
        throw new ConflictException('Connection request already pending');
      }
      if (existing.status === 'REJECTED') {
        throw new ConflictException('Connection request already exists');
      }
    }

    const connection = await this.repository.createConnection(requesterId, targetId);

    this.eventPublisher.publish(new ConnectionRequestedEvent(targetId, { requesterId }));

    return connection;
  }
}
