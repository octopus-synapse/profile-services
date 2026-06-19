/**
 * Array-backed `SavedExternalJobsRepositoryPort` double. Snapshot
 * semantics mirror the Prisma adapter: rows copy the listing's display
 * fields and never reference the listing again.
 */

import type { ExternalJobListingRecord } from '../domain/ports/external-job-listings.repository.port';
import {
  type SavedExternalJobRecord,
  SavedExternalJobsRepositoryPort,
} from '../domain/ports/saved-external-jobs.repository.port';

export class InMemorySavedExternalJobsRepository extends SavedExternalJobsRepositoryPort {
  readonly rows: SavedExternalJobRecord[] = [];
  private sequence = 0;

  async createFromListing(
    userId: string,
    listing: ExternalJobListingRecord,
  ): Promise<SavedExternalJobRecord> {
    this.sequence++;
    const row: SavedExternalJobRecord = {
      id: `saved-${this.sequence}`,
      userId,
      externalId: listing.externalId,
      title: listing.title,
      company: listing.company,
      location: listing.location,
      isRemote: listing.isRemote,
      workMode: listing.workMode,
      employmentType: listing.employmentType,
      applyUrl: listing.applyUrl,
      publisher: listing.publisher,
      description: listing.description,
      postedAt: listing.postedAt,
      fetchedAt: listing.fetchedAt,
      hasApplied: null,
      appliedAt: null,
      createdAt: new Date(Date.now() + this.sequence),
    };
    this.rows.push(row);
    return row;
  }

  async findByUserAndExternalId(
    userId: string,
    externalId: string,
  ): Promise<SavedExternalJobRecord | null> {
    return this.rows.find((r) => r.userId === userId && r.externalId === externalId) ?? null;
  }

  async findById(id: string): Promise<SavedExternalJobRecord | null> {
    return this.rows.find((r) => r.id === id) ?? null;
  }

  async setApplied(id: string, didApply: boolean): Promise<SavedExternalJobRecord> {
    const row = this.rows.find((r) => r.id === id);
    if (!row) throw new Error(`SavedExternalJob ${id} not found`);
    const updated: SavedExternalJobRecord = {
      ...row,
      hasApplied: didApply,
      appliedAt: didApply ? new Date() : null,
    };
    const index = this.rows.indexOf(row);
    this.rows[index] = updated;
    return updated;
  }

  async deleteById(id: string): Promise<void> {
    const index = this.rows.findIndex((r) => r.id === id);
    if (index >= 0) this.rows.splice(index, 1);
  }

  async listByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: SavedExternalJobRecord[]; total: number }> {
    const mine = this.rows
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const start = (page - 1) * limit;
    return { items: mine.slice(start, start + limit), total: mine.length };
  }

  async listSavedExternalIds(
    userId: string,
    externalIds: readonly string[],
  ): Promise<ReadonlyMap<string, string>> {
    const wanted = new Set(externalIds);
    return new Map(
      this.rows
        .filter((r) => r.userId === userId && wanted.has(r.externalId))
        .map((r) => [r.externalId, r.id]),
    );
  }
}
