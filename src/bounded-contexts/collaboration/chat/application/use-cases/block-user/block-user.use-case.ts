import { BadRequestException } from '@nestjs/common';
import type { BlockedUserResponse, BlockUser } from '../../../schemas/chat.schema';
import type { BlockRepositoryPort } from '../../ports/block.port';

export class BlockUserUseCase {
  constructor(private readonly repository: BlockRepositoryPort) {}

  async execute(blockerId: string, dto: BlockUser): Promise<BlockedUserResponse> {
    if (blockerId === dto.userId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const record = await this.repository.block(blockerId, dto.userId, dto.reason);

    return {
      id: record.id,
      blockedAt: record.createdAt.toISOString(),
      reason: record.reason,
      user: {
        id: record.blocked.id,
        displayName: record.blocked.displayName,
        photoURL: record.blocked.photoURL,
        username: record.blocked.username,
      },
    };
  }
}
