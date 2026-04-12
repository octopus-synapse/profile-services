import type { BlockedUserResponse } from '../../../schemas/chat.schema';
import { mapBlockedUserToResponse } from '../../mappers/chat.mapper';
import type { BlockRepositoryPort } from '../../ports/block.port';

export class GetBlockedUsersUseCase {
  constructor(private readonly repository: BlockRepositoryPort) {}

  async execute(userId: string): Promise<BlockedUserResponse[]> {
    const records = await this.repository.getBlockedUsers(userId);

    return records.map(mapBlockedUserToResponse);
  }
}
