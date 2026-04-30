/**
 * Rejects a Weekly Curated item — marks it `REJECTED` with `decidedAt`
 * stamped. Verifies ownership before mutating; missing item throws
 * `EntityNotFoundException`, foreign batch throws
 * `AutomationItemNotOwnedException`.
 */

import type { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { AutomationItemNotOwnedException } from '../../../domain/exceptions/automation.exceptions';
import { ApplyModeRepositoryPort } from '../../../domain/ports/apply-mode.repository.port';

const CTX = 'RejectCuratedItemUseCase';

export class RejectCuratedItemUseCase {
  constructor(
    private readonly repository: ApplyModeRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(userId: string, itemId: string): Promise<void> {
    const item = await this.repository.findItemWithOwner(itemId);
    if (!item) throw new EntityNotFoundException('WeeklyCuratedItem', itemId);
    if (item.userId !== userId) throw new AutomationItemNotOwnedException();

    await this.repository.updateItemDecision(itemId, {
      status: 'REJECTED',
      decidedAt: new Date(),
    });
    this.logger.log(`Rejected item=${itemId}`, CTX);
  }
}
