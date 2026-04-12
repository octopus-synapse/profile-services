/**
 * Prisma Benchmark Repository
 *
 * Loads ATS scores from the database for benchmarking.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { BenchmarkRepositoryPort } from '../../../application/ports/resume-analytics.port';

export class PrismaBenchmarkRepository implements BenchmarkRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getAllAtsScores(): Promise<number[]> {
    const snapshots = await this.prisma.resumeAnalytics.findMany({
      select: { atsScore: true },
    });
    return snapshots.map((s) => s.atsScore);
  }
}
