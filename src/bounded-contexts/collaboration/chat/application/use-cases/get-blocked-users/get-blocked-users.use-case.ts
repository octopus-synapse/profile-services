import type { BlockedUserResponse } from '../../../schemas/chat.schema';
import type { BlockRepositoryPort } from '../../ports/block.port';

export class GetBlockedUsersUseCase {
  constructor(private readonly repository: BlockRepositoryPort) {}

  async execute(userId: string): Promise<BlockedUserResponse[]> {
    const records = await this.repository.getBlockedUsers(userId);

    return records.map((record) => ({
      id: record.id,
      blockedAt: record.createdAt.toISOString(),
      reason: record.reason,
      user: {
        id: record.blocked.id,
        displayName: record.blocked.displayName,
        photoURL: record.blocked.photoURL,
        username: record.blocked.username,
      },
    }));
  }
}
