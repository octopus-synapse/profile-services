import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { BlockRepositoryPort } from '../../ports/block.port';

export class UnblockUserUseCase {
  constructor(private readonly repository: BlockRepositoryPort) {}

  async execute(blockerId: string, blockedId: string): Promise<void> {
    const isBlocked = await this.repository.isBlocked(blockerId, blockedId);
    if (!isBlocked) {
      throw new EntityNotFoundException('User', blockedId);
    }

    await this.repository.unblock(blockerId, blockedId);
  }
}
