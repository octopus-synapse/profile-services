/**
 * Prisma adapter for `SavedExternalJobsRepositoryPort`. Rows are
 * snapshots — no joins back to `ExternalJobListing`.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ExternalJobListingRecord } from '../../../domain/ports/external-job-listings.repository.port';
import {
  type SavedExternalJobRecord,
  SavedExternalJobsRepositoryPort,
} from '../../../domain/ports/saved-external-jobs.repository.port';

export class PrismaSavedExternalJobsRepository extends SavedExternalJobsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createFromListing(
    userId: string,
    listing: ExternalJobListingRecord,
  ): Promise<SavedExternalJobRecord> {
    return this.prisma.savedExternalJob.create({
      data: {
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
      },
    });
  }

  async findByUserAndExternalId(
    userId: string,
    externalId: string,
  ): Promise<SavedExternalJobRecord | null> {
    return this.prisma.savedExternalJob.findUnique({
      where: { userId_externalId: { userId, externalId } },
    });
  }

  async findById(id: string): Promise<SavedExternalJobRecord | null> {
    return this.prisma.savedExternalJob.findUnique({ where: { id } });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.savedExternalJob.delete({ where: { id } });
  }

  async listByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: SavedExternalJobRecord[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.savedExternalJob.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.savedExternalJob.count({ where: { userId } }),
    ]);
    return { items, total };
  }

  async listSavedExternalIds(
    userId: string,
    externalIds: readonly string[],
  ): Promise<ReadonlyMap<string, string>> {
    if (externalIds.length === 0) return new Map();
    const rows = await this.prisma.savedExternalJob.findMany({
      where: { userId, externalId: { in: [...externalIds] } },
      select: { id: true, externalId: true },
    });
    return new Map(rows.map((row) => [row.externalId, row.id]));
  }
}
