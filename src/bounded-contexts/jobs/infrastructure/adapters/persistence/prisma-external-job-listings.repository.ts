/**
 * Prisma adapter for `ExternalJobListingsRepositoryPort`. Dedup
 * semantics: upsert keyed by `externalId`; when a *new* `externalId`
 * arrives whose `dedupHash` already exists, the row is skipped
 * ('duplicate') — same vacancy re-listed by a different publisher.
 */

import type { Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  type ExternalJobListFilters,
  type ExternalJobListingRecord,
  ExternalJobListingsRepositoryPort,
  type ExternalJobUpsertOutcome,
} from '../../../domain/ports/external-job-listings.repository.port';
import type { ExternalJobPosting } from '../../../domain/ports/external-job-search.port';

export class PrismaExternalJobListingsRepository extends ExternalJobListingsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async upsertByExternalId(
    posting: ExternalJobPosting,
    dedupHash: string,
    sourceQuery: string,
    fetchedAt: Date,
  ): Promise<ExternalJobUpsertOutcome> {
    const existing = await this.prisma.externalJobListing.findUnique({
      where: { externalId: posting.externalId },
      select: { id: true },
    });

    if (!existing) {
      const sameVacancy = await this.prisma.externalJobListing.findFirst({
        where: { dedupHash },
        select: { id: true },
      });
      if (sameVacancy) return 'duplicate';
    }

    const data = {
      dedupHash,
      title: posting.title,
      company: posting.company,
      location: posting.location,
      isRemote: posting.isRemote,
      employmentType: posting.employmentType,
      applyUrl: posting.applyUrl,
      publisher: posting.publisher,
      description: posting.description,
      postedAt: posting.postedAt,
      fetchedAt,
      sourceQuery,
      raw: posting.raw as Prisma.InputJsonValue,
    };
    await this.prisma.externalJobListing.upsert({
      where: { externalId: posting.externalId },
      create: { externalId: posting.externalId, ...data },
      update: data,
    });
    return existing ? 'updated' : 'created';
  }

  async listListings(
    filters: ExternalJobListFilters,
    page: number,
    limit: number,
  ): Promise<{ items: ExternalJobListingRecord[]; total: number }> {
    const where: Prisma.ExternalJobListingWhereInput = {};
    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { company: { contains: filters.q, mode: 'insensitive' } },
      ];
    }
    if (filters.isRemote !== undefined) where.isRemote = filters.isRemote;
    if (filters.employmentType) where.employmentType = filters.employmentType;

    const [rows, total] = await Promise.all([
      this.prisma.externalJobListing.findMany({
        where,
        orderBy: [{ postedAt: { sort: 'desc', nulls: 'last' } }, { fetchedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.externalJobListing.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        ...row,
        raw: (row.raw ?? {}) as Record<string, unknown>,
      })),
      total,
    };
  }

  async deleteFetchedBefore(cutoff: Date): Promise<number> {
    const result = await this.prisma.externalJobListing.deleteMany({
      where: { fetchedAt: { lt: cutoff } },
    });
    return result.count;
  }
}
