import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { ConnectionRepositoryPort } from '../../ports/connection.port';

export class RemoveConnectionUseCase {
  constructor(private readonly repository: ConnectionRepositoryPort) {}

  async execute(connectionId: string, currentUserId: string): Promise<void> {
    const connection = await this.repository.findConnectionById(connectionId);
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    if (connection.status !== 'ACCEPTED') {
      throw new BadRequestException('Connection is not accepted');
    }

    if (connection.requesterId !== currentUserId && connection.targetId !== currentUserId) {
      throw new BadRequestException('You are not part of this connection');
    }

    await this.repository.deleteConnection(connectionId);
  }
}
