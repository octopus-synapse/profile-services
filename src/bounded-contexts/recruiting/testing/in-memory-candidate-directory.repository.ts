import type { SearchableCandidateRecord } from '../domain';
import { CandidateDirectoryRepositoryPort } from '../domain';

/**
 * In-memory stand-in for the Prisma-backed directory. Used by the
 * use-case spec so the test doesn't touch a DB. Seed with `add()` and
 * optionally exclude users via the standard `excludeUserId` filter.
 */
export class InMemoryCandidateDirectoryRepository implements CandidateDirectoryRepositoryPort {
  private records: SearchableCandidateRecord[] = [];

  add(record: SearchableCandidateRecord): void {
    this.records.push(record);
  }

  clear(): void {
    this.records = [];
  }

  async loadSearchablePool(params: {
    excludeUserId: string;
    poolCap: number;
  }): Promise<ReadonlyArray<SearchableCandidateRecord>> {
    return this.records.filter((r) => r.userId !== params.excludeUserId).slice(0, params.poolCap);
  }
}
