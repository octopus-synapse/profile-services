import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { ConnectionRepositoryPort, ConnectionWithUser } from '../../ports/connection.port';

export class RejectConnectionUseCase {
  constructor(private readonly repository: ConnectionRepositoryPort) {}

  async execute(connectionId: string, currentUserId: string): Promise<ConnectionWithUser> {
    const connection = await this.repository.findConnectionById(connectionId);
    if (!connection) {
      throw new NotFoundException('Connection request not found');
    }

    if (connection.status !== 'PENDING') {
      throw new BadRequestException('Connection request is not pending');
    }

    if (connection.targetId !== currentUserId) {
      throw new BadRequestException('Only the target user can reject a connection request');
    }

    return this.repository.updateConnectionStatus(connectionId, 'REJECTED');
  }
}
