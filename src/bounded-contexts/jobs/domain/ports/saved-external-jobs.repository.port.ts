/**
 * Persistence port for user-saved external listings. Rows snapshot the
 * listing's display fields at save time — the `ExternalJobListing`
 * mirror is swept after 30 days, but a saved job must survive that.
 * Method naming follows Q10: `find*` → null, `list*` → [].
 */

import type { JobType, RemotePolicy } from '@prisma/client';
import type { ExternalJobListingRecord } from './external-job-listings.repository.port';

export interface SavedExternalJobRecord {
  readonly id: string;
  readonly userId: string;
  readonly externalId: string;
  readonly title: string;
  readonly company: string;
  readonly location: string | null;
  readonly isRemote: boolean;
  readonly workMode: RemotePolicy;
  readonly employmentType: JobType | null;
  readonly applyUrl: string;
  readonly publisher: string | null;
  readonly description: string | null;
  readonly postedAt: Date | null;
  readonly fetchedAt: Date;
  // Self-reported application state (external listings apply off-app, so the
  // client prompts on return). null = never answered, true/false = the answer.
  readonly hasApplied: boolean | null;
  readonly appliedAt: Date | null;
  readonly createdAt: Date;
}

export abstract class SavedExternalJobsRepositoryPort {
  /** Snapshots the listing's display fields into a new saved row. */
  abstract createFromListing(
    userId: string,
    listing: ExternalJobListingRecord,
  ): Promise<SavedExternalJobRecord>;

  abstract findByUserAndExternalId(
    userId: string,
    externalId: string,
  ): Promise<SavedExternalJobRecord | null>;

  abstract findById(id: string): Promise<SavedExternalJobRecord | null>;

  /**
   * Records the user's self-reported answer to "você se candidatou?".
   * `didApply === true` stamps `appliedAt`; `false` clears it. Returns the
   * updated row.
   */
  abstract setApplied(id: string, didApply: boolean): Promise<SavedExternalJobRecord>;

  abstract deleteById(id: string): Promise<void>;

  /** Newest-saved first. */
  abstract listByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: SavedExternalJobRecord[]; total: number }>;

  /**
   * Batch `isSaved` annotation for a page of listings: returns a map of
   * externalId → saved row id for the subset the user has saved.
   */
  abstract listSavedExternalIds(
    userId: string,
    externalIds: readonly string[],
  ): Promise<ReadonlyMap<string, string>>;
}
