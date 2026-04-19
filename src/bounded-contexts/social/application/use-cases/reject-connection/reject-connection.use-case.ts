import {
  EntityNotFoundException,
  ValidationException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import type { ConnectionRepositoryPort, ConnectionWithUser } from '../../ports/connection.port';

export class RejectConnectionUseCase {
  constructor(private readonly repository: ConnectionRepositoryPort) {}

  async execute(connectionId: string, currentUserId: string): Promise<ConnectionWithUser> {
    const connection = await this.repository.findConnectionById(connectionId);
    if (!connection) {
      throw new EntityNotFoundException('Connection', connectionId);
    }

    if (connection.status !== 'PENDING') {
      throw new ValidationException('Connection request is not pending');
    }

    if (connection.targetId !== currentUserId) {
      throw new ValidationException('Only the target user can reject a connection request');
    }

    return this.repository.updateConnectionStatus(connectionId, 'REJECTED');
  }
}
