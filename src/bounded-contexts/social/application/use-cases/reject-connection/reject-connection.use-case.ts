import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import {
  ConnectionNotPendingException,
  NotConnectionTargetException,
} from '../../../domain/exceptions/social.exceptions';
import type { ConnectionRepositoryPort, ConnectionWithUser } from '../../ports/connection.port';

export class RejectConnectionUseCase {
  constructor(private readonly repository: ConnectionRepositoryPort) {}

  async execute(connectionId: string, currentUserId: string): Promise<ConnectionWithUser> {
    const connection = await this.repository.findConnectionById(connectionId);
    if (!connection) {
      throw new EntityNotFoundException('Connection', connectionId);
    }

    if (connection.status !== 'PENDING') {
      throw new ConnectionNotPendingException();
    }

    if (connection.targetId !== currentUserId) {
      throw new NotConnectionTargetException('reject');
    }

    return this.repository.updateConnectionStatus(connectionId, 'REJECTED');
  }
}
