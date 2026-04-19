import {
  EntityNotFoundException,
  ValidationException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import type { ConnectionRepositoryPort } from '../../ports/connection.port';

export class RemoveConnectionUseCase {
  constructor(private readonly repository: ConnectionRepositoryPort) {}

  async execute(connectionId: string, currentUserId: string): Promise<void> {
    const connection = await this.repository.findConnectionById(connectionId);
    if (!connection) {
      throw new EntityNotFoundException('Connection', connectionId);
    }

    if (connection.status !== 'ACCEPTED') {
      throw new ValidationException('Connection is not accepted');
    }

    if (connection.requesterId !== currentUserId && connection.targetId !== currentUserId) {
      throw new ValidationException('You are not part of this connection');
    }

    await this.repository.deleteConnection(connectionId);
  }
}
