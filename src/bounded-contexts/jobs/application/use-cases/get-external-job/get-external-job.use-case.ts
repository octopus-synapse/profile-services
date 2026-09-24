import type { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { ExternalJobListingsRepositoryPort } from '../../../domain/ports/external-job-listings.repository.port';
import type { SavedExternalJobsRepositoryPort } from '../../../domain/ports/saved-external-jobs.repository.port';
import type { ExternalJobListItem } from '../list-external-jobs/list-external-jobs.use-case';

/** Resolves a cold detail link; private snapshots are accessible only to their owner. */
export class GetExternalJobUseCase {
  constructor(
    private readonly listings: ExternalJobListingsRepositoryPort,
    private readonly saved: SavedExternalJobsRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(id: string, userId: string): Promise<ExternalJobListItem> {
    const listing = await this.listings.findListingById(id);
    if (listing) {
      const saved = await this.saved.findByUserAndExternalId(userId, listing.externalId);
      return { ...listing, savedId: saved?.id ?? null };
    }
    const snapshot = await this.saved.findById(id);
    if (!snapshot || snapshot.userId !== userId) throw new EntityNotFoundException('Job', id);
    const live = await this.listings.findListingByExternalId(snapshot.externalId);
    if (live) return { ...live, savedId: snapshot.id };
    this.logger.debug('Serving retained saved-job snapshot', 'GetExternalJobUseCase', {
      externalId: snapshot.externalId,
    });
    return { ...snapshot, savedId: snapshot.id, raw: {}, dedupHash: '', sourceQuery: '' };
  }
}
