import { ValidationException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { BlockedUserResponse, BlockUser } from '../../../schemas/chat.schema';
import { mapBlockedUserToResponse } from '../../mappers/chat.mapper';
import type { BlockRepositoryPort } from '../../ports/block.port';

export class BlockUserUseCase {
  constructor(private readonly repository: BlockRepositoryPort) {}

  async execute(blockerId: string, dto: BlockUser): Promise<BlockedUserResponse> {
    if (blockerId === dto.userId) {
      throw new ValidationException('Cannot block yourself');
    }

    const record = await this.repository.block(blockerId, dto.userId, dto.reason);

    return mapBlockedUserToResponse(record);
  }
}
