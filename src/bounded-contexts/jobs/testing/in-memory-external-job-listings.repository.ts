/**
 * Array-backed `ExternalJobListingsRepositoryPort` double mirroring the
 * Prisma adapter's dedup semantics: upsert by `externalId`, 'duplicate'
 * when the `dedupHash` already exists under a different `externalId`.
 */

import {
  type ExternalJobListFilters,
  type ExternalJobListingRecord,
  ExternalJobListingsRepositoryPort,
  type ExternalJobUpsertOutcome,
} from '../domain/ports/external-job-listings.repository.port';
import type { ExternalJobPosting } from '../domain/ports/external-job-search.port';

export class InMemoryExternalJobListingsRepository extends ExternalJobListingsRepositoryPort {
  readonly rows: ExternalJobListingRecord[] = [];
  private sequence = 0;

  async upsertByExternalId(
    posting: ExternalJobPosting,
    dedupHash: string,
    sourceQuery: string,
    fetchedAt: Date,
  ): Promise<ExternalJobUpsertOutcome> {
    const existing = this.rows.find((r) => r.externalId === posting.externalId);
    if (existing) {
      const index = this.rows.indexOf(existing);
      this.rows[index] = { ...existing, ...posting, dedupHash, sourceQuery, fetchedAt };
      return 'updated';
    }
    if (this.rows.some((r) => r.dedupHash === dedupHash)) return 'duplicate';
    this.sequence++;
    this.rows.push({
      ...posting,
      id: `ext-${this.sequence}`,
      dedupHash,
      sourceQuery,
      fetchedAt,
    });
    return 'created';
  }

  async listListings(
    filters: ExternalJobListFilters,
    page: number,
    limit: number,
  ): Promise<{ items: ExternalJobListingRecord[]; total: number }> {
    const q = filters.q?.toLowerCase();
    const filtered = this.rows.filter((r) => {
      if (q && !r.title.toLowerCase().includes(q) && !r.company.toLowerCase().includes(q)) {
        return false;
      }
      if (filters.isRemote !== undefined && r.isRemote !== filters.isRemote) return false;
      if (filters.employmentType && r.employmentType !== filters.employmentType) return false;
      return true;
    });
    const start = (page - 1) * limit;
    return { items: filtered.slice(start, start + limit), total: filtered.length };
  }

  async deleteFetchedBefore(cutoff: Date): Promise<number> {
    const keep = this.rows.filter((r) => r.fetchedAt >= cutoff);
    const deleted = this.rows.length - keep.length;
    this.rows.length = 0;
    this.rows.push(...keep);
    return deleted;
  }
}
