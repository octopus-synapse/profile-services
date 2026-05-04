import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import {
  ConnectionNotAcceptedException,
  NotPartOfConnectionException,
} from '../../../domain/exceptions/social.exceptions';
import { ConnectionRepositoryPort } from '../../ports/connection.port';

export class RemoveConnectionUseCase {
  constructor(private readonly repository: ConnectionRepositoryPort) {}

  async execute(connectionId: string, currentUserId: string): Promise<void> {
    const connection = await this.repository.getConnectionById(connectionId);

    if (connection.status !== 'ACCEPTED') {
      throw new ConnectionNotAcceptedException();
    }

    if (connection.requesterId !== currentUserId && connection.targetId !== currentUserId) {
      throw new NotPartOfConnectionException();
    }

    await this.repository.deleteConnection(connectionId);
  }
}
