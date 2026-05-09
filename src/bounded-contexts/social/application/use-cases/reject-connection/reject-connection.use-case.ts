import {
  ConnectionNotPendingException,
  NotConnectionTargetException,
} from '../../../domain/exceptions/social.exceptions';
import type { ConnectionWithUser } from '../../ports/connection.port';
import { ConnectionRepositoryPort } from '../../ports/connection.port';

export class RejectConnectionUseCase {
  constructor(private readonly repository: ConnectionRepositoryPort) {}

  async execute(connectionId: string, currentUserId: string): Promise<ConnectionWithUser> {
    const connection = await this.repository.getConnectionById(connectionId);

    if (connection.status !== 'PENDING') {
      throw new ConnectionNotPendingException();
    }

    if (connection.targetId !== currentUserId) {
      throw new NotConnectionTargetException('reject');
    }

    return this.repository.updateConnectionStatus(connectionId, 'REJECTED');
  }
}
