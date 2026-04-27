/**
 * Returns the most recent Weekly Curated batch for the viewer, projected
 * into the API view (ISO date strings, items already sorted by score in
 * the adapter). Returns `null` when the user has no batch yet.
 */

import type { WeeklyCuratedBatchView } from '../../../domain/entities/weekly-curated-batch-view';
import type { WeeklyCuratedItemRow } from '../../../domain/entities/weekly-curated-item';
import { ApplyModeRepositoryPort } from '../../../domain/ports/apply-mode.repository.port';

export class GetCurrentBatchUseCase {
  constructor(private readonly repository: ApplyModeRepositoryPort) {}

  async execute(userId: string): Promise<WeeklyCuratedBatchView | null> {
    const batch = await this.repository.findCurrentBatchForUser(userId);
    if (!batch) return null;
    return {
      id: batch.id,
      weekOf: batch.weekOf.toISOString(),
      sentAt: batch.sentAt?.toISOString() ?? null,
      status: batch.status,
      items: batch.items.map(toItemView),
    };
  }
}

function toItemView(i: WeeklyCuratedItemRow) {
  return {
    id: i.id,
    jobId: i.jobId,
    matchScore: i.matchScore,
    status: i.status,
    decidedAt: i.decidedAt?.toISOString() ?? null,
  };
}
