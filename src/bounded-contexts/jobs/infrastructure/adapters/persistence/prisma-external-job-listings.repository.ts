/**
 * Prisma adapter for `ExternalJobListingsRepositoryPort`. Dedup
 * semantics: upsert keyed by `externalId`; when a *new* `externalId`
 * arrives whose `dedupHash` already exists, the row is skipped
 * ('duplicate') — same vacancy re-listed by a different publisher.
 */

import type { Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import {
  type ExternalJobListFilters,
  type ExternalJobListingRecord,
  ExternalJobListingsRepositoryPort,
  type ExternalJobUpsertOutcome,
} from '../../../domain/ports/external-job-listings.repository.port';
import type { ExternalJobPosting } from '../../../domain/ports/external-job-search.port';

const CTX = 'PrismaExternalJobListingsRepository';

export class PrismaExternalJobListingsRepository extends ExternalJobListingsRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
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
      workMode: posting.workMode,
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
    // `q` and `postedAfter` both expand to OR groups, so each goes into
    // its own AND member instead of a top-level `where.OR`.
    const and: Prisma.ExternalJobListingWhereInput[] = [];
    if (filters.q) {
      and.push({
        OR: [
          { title: { contains: filters.q, mode: 'insensitive' } },
          { company: { contains: filters.q, mode: 'insensitive' } },
        ],
      });
    }
    if (filters.postedAfter) {
      // COALESCE(postedAt, fetchedAt) >= cutoff — same fallback the UI
      // uses to display recency (postedAt is often null for BR rows).
      and.push({
        OR: [
          { postedAt: { gte: filters.postedAfter } },
          { postedAt: null, fetchedAt: { gte: filters.postedAfter } },
        ],
      });
    }
    const where: Prisma.ExternalJobListingWhereInput = and.length > 0 ? { AND: and } : {};
    if (filters.workMode?.length) where.workMode = { in: [...filters.workMode] };
    if (filters.employmentType?.length) where.employmentType = { in: [...filters.employmentType] };

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

  async findListingById(id: string): Promise<ExternalJobListingRecord | null> {
    const row = await this.prisma.externalJobListing.findUnique({ where: { id } });
    if (!row) return null;
    return { ...row, raw: (row.raw ?? {}) as Record<string, unknown> };
  }

  async deleteFetchedBefore(cutoff: Date): Promise<number> {
    const result = await this.prisma.externalJobListing.deleteMany({
      where: { fetchedAt: { lt: cutoff } },
    });
    if (result.count > 0) {
      this.logger.log(`retention sweep removed ${result.count} listings`, CTX);
    }
    return result.count;
  }
}
