import { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { ConnectionRequestedEvent } from '../../../domain/events';
import {
  AlreadyConnectedException,
  CannotConnectWithSelfException,
  ConnectionRequestExistsException,
  ConnectionRequestPendingException,
} from '../../../domain/exceptions/social.exceptions';
import type { ConnectionRepositoryPort, ConnectionWithUser } from '../../ports/connection.port';

export class SendConnectionRequestUseCase {
  constructor(
    private readonly repository: ConnectionRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(requesterId: string, targetId: string): Promise<ConnectionWithUser> {
    if (requesterId === targetId) {
      throw new CannotConnectWithSelfException();
    }

    const targetExists = await this.repository.userExists(targetId);
    if (!targetExists) {
      throw new EntityNotFoundException('User', targetId);
    }

    const existing = await this.repository.findConnectionBetween(requesterId, targetId);
    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new AlreadyConnectedException();
      }
      if (existing.status === 'PENDING') {
        throw new ConnectionRequestPendingException();
      }
      if (existing.status === 'REJECTED') {
        throw new ConnectionRequestExistsException();
      }
    }

    const connection = await this.repository.createConnection(requesterId, targetId);

    this.eventPublisher.publish(new ConnectionRequestedEvent(targetId, { requesterId }));

    return connection;
  }
}
