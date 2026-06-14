/**
 * Idempotent unsave keyed by the saved row id (the listing may already
 * have been swept, so the listing id is useless here). A row owned by
 * another user is reported as not found — same response as a missing
 * row, no existence leak.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { SavedExternalJobsRepositoryPort } from '../../../domain/ports/saved-external-jobs.repository.port';

export interface UnsaveExternalJobResult {
  readonly savedId: string;
  readonly removed: true;
}

export class UnsaveExternalJobUseCase {
  constructor(private readonly saved: SavedExternalJobsRepositoryPort) {}

  async execute(savedId: string, userId: string): Promise<UnsaveExternalJobResult> {
    const row = await this.saved.findById(savedId);
    if (!row) return { savedId, removed: true };
    if (row.userId !== userId) throw new EntityNotFoundException('SavedExternalJob', savedId);
    await this.saved.deleteById(savedId);
    return { savedId, removed: true };
  }
}
