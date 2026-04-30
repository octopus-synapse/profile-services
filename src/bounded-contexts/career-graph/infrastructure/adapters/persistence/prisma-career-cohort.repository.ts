import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { CohortRequest } from '../../../domain';
import {
  CareerCohortRepositoryPort,
  type CohortBucket,
  SIMILARITY_THRESHOLD,
} from '../../../domain';

/**
 * Prisma adapter for the career-graph cohort lookups.
 *
 * Intentionally computes skill-overlap in JavaScript over a bounded pool.
 * Rationale: Postgres doesn't have a cheap "set-jaccard" built-in without
 * a third-party extension, and the candidate pool for the UI is already
 * small (opt-in public profiles, capped at 500). A follow-up can swap in
 * a materialized view + pg extension when we grow past that ceiling.
 *
 * Pool filter mirrors the recruiting BC:
 *   - `profileVisibility in (public, link)`
 *   - `isActive = true`
 *   - `hasCompletedOnboarding = true`
 *   - requester excluded
 */

const CANDIDATE_POOL_CAP = 500;
const TITLES_PER_BUCKET = 3;

export class PrismaCareerCohortRepository implements CareerCohortRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async loadRequesterSnapshot(
    requesterId: string,
  ): Promise<{ experienceYears: number; jobTitle: string | null } | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: {
        primaryResume: {
          select: { experienceYears: true, jobTitle: true },
        },
      },
    });
    if (!row?.primaryResume) return null;
    return {
      experienceYears: row.primaryResume.experienceYears ?? 0,
      jobTitle: row.primaryResume.jobTitle,
    };
  }

  async loadCohortBuckets(input: CohortRequest): Promise<ReadonlyArray<CohortBucket>> {
    if (input.stack.length === 0) return [];

    const pool = await this.prisma.user.findMany({
      where: {
        id: { not: input.requesterId },
        isActive: true,
        onboardingCompletedAt: { not: null },
        preferences: { profileVisibility: { in: ['public', 'link'] } },
        primaryResume: { isNot: null },
      },
      take: CANDIDATE_POOL_CAP,
      select: {
        primaryResume: {
          select: { experienceYears: true, jobTitle: true, primaryStack: true },
        },
      },
    });

    const requesterStack = normalizeSet(input.stack);
    const byYears = new Map<number, Map<string, number>>();
    let kept = 0;

    for (const row of pool) {
      const resume = row.primaryResume;
      if (!resume) continue;
      const candidateStack = normalizeSet(resume.primaryStack ?? []);
      const overlap = jaccardLike(requesterStack, candidateStack);
      if (overlap < SIMILARITY_THRESHOLD) continue;

      const years = Math.max(0, resume.experienceYears ?? 0);
      const title = (resume.jobTitle ?? '').trim();
      const bucket = byYears.get(years) ?? new Map<string, number>();
      if (title) bucket.set(title, (bucket.get(title) ?? 0) + 1);
      // Record an "__peer" counter even for null-title peers so peer count is accurate.
      bucket.set('__peer', (bucket.get('__peer') ?? 0) + 1);
      byYears.set(years, bucket);
      kept++;
    }

    if (kept === 0) return [];

    const buckets: CohortBucket[] = [];
    for (const [years, titleMap] of byYears) {
      const peerCount = titleMap.get('__peer') ?? 0;
      titleMap.delete('__peer');
      const topJobTitles = [...titleMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, TITLES_PER_BUCKET)
        .map(([title, count]) => ({ title, count }));
      buckets.push({ experienceYears: years, peerCount, topJobTitles });
    }

    buckets.sort((a, b) => a.experienceYears - b.experienceYears);
    return buckets.slice(0, input.maxBuckets);
  }
}

function normalizeSet(skills: ReadonlyArray<string>): Set<string> {
  const out = new Set<string>();
  for (const skill of skills) {
    if (typeof skill === 'string' && skill.trim()) out.add(skill.trim().toLowerCase());
  }
  return out;
}

/**
 * Asymmetric overlap — we care about coverage from the requester's stack
 * perspective (the user wants to see "people who know what I know"),
 * not true Jaccard. A peer who also has extra skills still scores high.
 */
function jaccardLike(requester: Set<string>, candidate: Set<string>): number {
  if (requester.size === 0) return 0;
  let matched = 0;
  for (const s of requester) if (candidate.has(s)) matched++;
  return matched / requester.size;
}
