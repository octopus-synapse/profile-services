import type { BlockRepositoryPort } from '../../ports/block.port';

export class CheckBlockStatusUseCase {
  constructor(private readonly repository: BlockRepositoryPort) {}

  async execute(blockerId: string, blockedId: string): Promise<boolean> {
    return this.repository.isBlocked(blockerId, blockedId);
  }
}
