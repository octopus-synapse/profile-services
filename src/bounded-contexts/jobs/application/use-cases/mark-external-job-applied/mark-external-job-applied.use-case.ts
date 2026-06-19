/**
 * Records the user's self-reported answer to "você se candidatou?" for an
 * external (off-app) listing, keyed by the saved row id. Applying to an
 * external job leaves the app, so the outcome can't be observed — the client
 * prompts on return and we persist the answer here. A row owned by another
 * user is reported as not found (same as a missing row, no existence leak).
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { SavedExternalJobsRepositoryPort } from '../../../domain/ports/saved-external-jobs.repository.port';

export interface MarkExternalJobAppliedResult {
  readonly savedId: string;
  readonly hasApplied: boolean;
  readonly appliedAt: string | null;
}

export class MarkExternalJobAppliedUseCase {
  constructor(private readonly saved: SavedExternalJobsRepositoryPort) {}

  async execute(
    savedId: string,
    userId: string,
    didApply: boolean,
  ): Promise<MarkExternalJobAppliedResult> {
    const row = await this.saved.findById(savedId);
    if (!row || row.userId !== userId) {
      throw new EntityNotFoundException('SavedExternalJob', savedId);
    }
    const updated = await this.saved.setApplied(savedId, didApply);
    return {
      savedId: updated.id,
      hasApplied: updated.hasApplied ?? didApply,
      appliedAt: updated.appliedAt ? updated.appliedAt.toISOString() : null,
    };
  }
}
