/**
 * Prisma Benchmark Repository — STUB
 *
 * The ATS score columns were dropped from ResumeAnalytics as part of the
 * scoring subsystem refactor. Benchmark data will be sourced from
 * `ResumeQualityScoreHistory` in a follow-up task (see
 * docs/scoring/SCORES_TODO.md). For now this returns an empty array so
 * dependents still boot.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { BenchmarkRepositoryPort } from '../../../application/ports/resume-analytics.port';

export class PrismaBenchmarkRepository implements BenchmarkRepositoryPort {
  constructor(private readonly _prisma: PrismaService) {}

  async getAllAtsScores(): Promise<number[]> {
    return [];
  }
}
