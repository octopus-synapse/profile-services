/**
 * Approves a Weekly Curated item — submits a `JobApplication` using the
 * user's primary resume + default cover letter. Idempotent: a second
 * approve on the same item returns the existing application instead of
 * creating a duplicate.
 *
 * Authorization: the item's batch must belong to the calling user;
 * otherwise we throw `AutomationItemNotOwnedException` so the boundary
 * can map it to a 403.
 */

import type { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { AutomationItemNotOwnedException } from '../../../domain/exceptions/automation.exceptions';
import { ApplyModeRepositoryPort } from '../../../domain/ports/apply-mode.repository.port';

const CTX = 'ApproveCuratedItemUseCase';

export interface ApproveCuratedItemResult {
  readonly applicationId: string;
  readonly alreadyApplied: boolean;
}

export class ApproveCuratedItemUseCase {
  constructor(
    private readonly repository: ApplyModeRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(userId: string, itemId: string): Promise<ApproveCuratedItemResult> {
    const item = await this.repository.findItemWithOwner(itemId);
    if (!item) throw new EntityNotFoundException('WeeklyCuratedItem', itemId);
    if (item.userId !== userId) throw new AutomationItemNotOwnedException();

    const existing = await this.repository.findApplication(item.jobId, userId);
    if (existing) {
      await this.repository.updateItemDecision(itemId, {
        status: 'APPROVED',
        decidedAt: new Date(),
        applicationId: existing.id,
      });
      this.logger.log(`Re-approved item=${itemId} reusing application=${existing.id}`, CTX);
      return { applicationId: existing.id, alreadyApplied: true };
    }

    const defaults = await this.repository.getUserApplicationDefaults(userId);
    const created = await this.repository.createApplication({
      jobId: item.jobId,
      userId,
      resumeId: defaults.primaryResumeId,
      coverLetter: defaults.defaultCover,
    });

    await this.repository.updateItemDecision(itemId, {
      status: 'APPROVED',
      decidedAt: new Date(),
      applicationId: created.id,
    });

    this.logger.log(`Approved item=${itemId} → application=${created.id}`, CTX);
    return { applicationId: created.id, alreadyApplied: false };
  }
}
