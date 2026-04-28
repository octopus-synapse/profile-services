/**
 * Decorates a list of jobs with the viewer-relative flags (`isBookmarked`,
 * `hasApplied`) the UI relies on. Also exposes the LLM/HTML-free job
 * import URL fetching is unrelated — kept in `job-import.service.ts`.
 *
 * The viewer flags require two cheap `IN (...)` lookups against
 * `JobBookmark` and `JobApplication`. We always return the full set —
 * pre-existing rows that lacked the flags now get `false`.
 */

import { JobsRepositoryPort } from '../../domain/ports/jobs.repository.port';

export interface EnrichedJob<_T extends { id: string }> {
  isBookmarked: boolean;
  hasApplied: boolean;
}

export class JobEnrichmentService {
  constructor(private readonly repository: JobsRepositoryPort) {}

  async withBookmarkedAndApplied<T extends { id: string }>(
    items: T[],
    viewerId: string | undefined,
  ): Promise<Array<T & EnrichedJob<T>>> {
    if (!viewerId || items.length === 0) {
      return items.map((item) => ({ ...item, isBookmarked: false, hasApplied: false }));
    }
    const ids = items.map((i) => i.id);
    const [bookmarkedIds, appliedIds] = await Promise.all([
      this.repository.findBookmarkedJobIds(viewerId, ids),
      this.repository.findActiveApplicationJobIds(viewerId, ids),
    ]);
    return items.map((item) => ({
      ...item,
      isBookmarked: bookmarkedIds.has(item.id),
      hasApplied: appliedIds.has(item.id),
    }));
  }
}
