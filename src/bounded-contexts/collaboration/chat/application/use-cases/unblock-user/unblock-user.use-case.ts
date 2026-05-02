import { BlockNotFoundException } from '@/bounded-contexts/collaboration/domain/exceptions/collaboration.exceptions';
import { BlockRepositoryPort } from '../../ports/block.port';

export class UnblockUserUseCase {
  constructor(private readonly repository: BlockRepositoryPort) {}

  async execute(blockerId: string, blockedId: string): Promise<void> {
    const isBlocked = await this.repository.isBlocked(blockerId, blockedId);
    if (!isBlocked) {
      throw new BlockNotFoundException();
    }

    await this.repository.unblock(blockerId, blockedId);
  }
}
