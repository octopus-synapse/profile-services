import {
  AlreadyBlockedException,
  CannotBlockSelfException,
} from '@/bounded-contexts/collaboration/domain/exceptions/collaboration.exceptions';
import type { BlockedUserResponse, BlockUser } from '../../../schemas/chat.schema';
import { mapBlockedUserToResponse } from '../../mappers/chat.mapper';
import { BlockRepositoryPort } from '../../ports/block.port';

export class BlockUserUseCase {
  constructor(private readonly repository: BlockRepositoryPort) {}

  async execute(blockerId: string, dto: BlockUser): Promise<BlockedUserResponse> {
    if (blockerId === dto.userId) {
      throw new CannotBlockSelfException();
    }

    if (await this.repository.isBlocked(blockerId, dto.userId)) {
      throw new AlreadyBlockedException();
    }

    const record = await this.repository.block(blockerId, dto.userId, dto.reason);

    return mapBlockedUserToResponse(record);
  }
}
