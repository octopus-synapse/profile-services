import { LoggerPort } from '@/shared-kernel';
import { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import { ConnectionAcceptedEvent } from '../../../domain/events';
import {
  ConnectionNotPendingException,
  NotConnectionTargetException,
} from '../../../domain/exceptions/social.exceptions';
import type { ConnectionWithUser } from '../../ports/connection.port';
import { ConnectionRepositoryPort } from '../../ports/connection.port';

export class AcceptConnectionUseCase {
  constructor(
    private readonly repository: ConnectionRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(connectionId: string, currentUserId: string): Promise<ConnectionWithUser> {
    const connection = await this.repository.getConnectionById(connectionId);

    if (connection.status !== 'PENDING') {
      throw new ConnectionNotPendingException();
    }

    if (connection.targetId !== currentUserId) {
      throw new NotConnectionTargetException('accept');
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
