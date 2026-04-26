import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { type JobForMatch, JobLoaderPort } from '../../../domain/ports/job-loader.port';

type JobStructuredRequirements = Readonly<Record<string, unknown>>;

/**
 * Prisma-backed JobLoader. Reads just enough to drive the four sub-scores:
 * keywords (from the job's tech list), structured + enriched requirements
 * (for the Requirements Matcher), plus the company reference and whether
 * a culture profile was captured (for the Fit sub-score to decide whether
 * to consult `SimilarityPort.culture()`).
 */
@Injectable()
export class PrismaJobLoader extends JobLoaderPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async load(jobId: string): Promise<JobForMatch | null> {
    const row = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        skills: true,
        requirementsStructured: true,
        requirementsEnrichedByAi: true,
        culturalProfileCaptured: true, // `Job.company` is a free-text string at this stage (the
        // employer isn't modelled yet). We pass it through as the
        // "company id" so SimilarityPort can decide whether a culture
        // vector exists for it (today: always null; the adapter stays
        // stable once Companies land as a real entity).
        company: true,
      },
    });
    if (!row) return null;

    return {
      id: row.id,
      keywords: row.skills ?? [],
      structuredRequirements:
        (row.requirementsStructured as Prisma.JsonValue as JobStructuredRequirements | null) ?? {},
      enrichedByAi:
        (row.requirementsEnrichedByAi as Prisma.JsonValue as JobStructuredRequirements | null) ??
        undefined,
      culturalProfileCaptured: row.culturalProfileCaptured,
      companyId: row.company || null,
    };
  }
}
