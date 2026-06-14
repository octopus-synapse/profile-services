/**
 * Idempotent save of an external listing. Snapshots the listing's
 * display fields into `SavedExternalJob` so the saved row outlives the
 * 30-day retention sweep on the mirror table. Re-saving returns
 * `{ alreadySaved: true }` so the UI can branch without raising.
 */

import type { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { ExternalJobListingsRepositoryPort } from '../../../domain/ports/external-job-listings.repository.port';
import type { SavedExternalJobsRepositoryPort } from '../../../domain/ports/saved-external-jobs.repository.port';

export interface SaveExternalJobResult {
  readonly savedId: string;
  readonly externalId: string;
  readonly alreadySaved: boolean;
}

export class SaveExternalJobUseCase {
  constructor(
    private readonly listings: ExternalJobListingsRepositoryPort,
    private readonly saved: SavedExternalJobsRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(listingId: string, userId: string): Promise<SaveExternalJobResult> {
    const listing = await this.listings.findListingById(listingId);
    if (!listing) throw new EntityNotFoundException('ExternalJobListing', listingId);

    const existing = await this.saved.findByUserAndExternalId(userId, listing.externalId);
    if (existing) {
      return { savedId: existing.id, externalId: existing.externalId, alreadySaved: true };
    }
    const row = await this.saved.createFromListing(userId, listing);
    return { savedId: row.id, externalId: row.externalId, alreadySaved: false };
  }
}
