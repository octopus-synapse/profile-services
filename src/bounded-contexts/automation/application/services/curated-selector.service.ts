import { CuratedSelectorAllScoringFailedException } from '@/bounded-contexts/automation/domain/exceptions/automation.exceptions';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { ResumeJobMatcherPort } from '../../domain/ports/resume-job-matcher.port';

/**
 * Picks the top N jobs that match a user's primary resume, subject to any
 * `UserApplyCriteria` filters they set.
 *
 * Shared by both workers: Weekly-Curated uses it once a week per user;
 * Auto-Apply hits it hourly with a tighter `since` window and min-fit floor.
 *
 * POJO orchestrator — wired via the module's `useFactory`. Takes a
 * `LoggerPort` instead of Nest's built-in `Logger` so the testing
 * harness can swap in `stubLogger` without bringing in Nest.
 */

const CTX = 'CuratedSelectorService';

export class CuratedSelectorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matcher: ResumeJobMatcherPort,
    private readonly logger: LoggerPort,
  ) {}

  /**
   * Score and rank jobs created after `since` against the user's primary
   * resume. Returns the top `limit` whose `matchScore >= minFit`.
   */
  async selectForUser(params: {
    userId: string;
    since: Date;
    minFit?: number;
    limit?: number;
  }): Promise<Array<{ jobId: string; matchScore: number }>> {
    const { userId, since } = params;
    const minFit = params.minFit ?? 80;
    const limit = params.limit ?? 5;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        primaryResumeId: true,
        preferences: {
          select: { applyCriteria: true },
        },
      },
    });
    if (!user?.primaryResumeId) return [];

    const criteria = user.preferences?.applyCriteria ?? null;

    // Narrow the candidate pool with the user's structured criteria before we
    // reach for the (expensive) scoring pass. Always excludes the user's own
    // jobs and jobs the user has already applied to.
    const where: Record<string, unknown> = {
      isActive: true,
      createdAt: { gte: since },
      authorId: { not: userId },
      applications: { none: { userId } },
    };
    if (criteria?.remotePolicies?.length) {
      where.remotePolicy = { in: criteria.remotePolicies };
    }
    if (criteria?.paymentCurrencies?.length) {
      where.paymentCurrency = { in: criteria.paymentCurrencies };
    }
    if (criteria?.stacks?.length) {
      where.skills = { hasSome: criteria.stacks };
    }

    // Pull a reasonable pool — scoring is keyword-based and cheap. We cap at
    // 80 candidates to keep the worker runtime bounded.
    const candidates = await this.prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 80,
      select: { id: true, title: true, description: true, requirements: true, skills: true },
    });

    const scored: Array<{ jobId: string; matchScore: number }> = [];
    let scoringFailures = 0;
    const jobs = candidates;
    for (const job of jobs) {
      const jobText = [
        job.title,
        (job.requirements ?? []).join('\n'),
        (job.skills ?? []).join(', '),
        job.description,
      ]
        .filter(Boolean)
        .join('\n\n');

      try {
        const match = await this.matcher.matchJobDescription(user.primaryResumeId, userId, jobText);
        if (match.matchScore >= minFit) {
          scored.push({ jobId: job.id, matchScore: match.matchScore });
        }
      } catch (err) {
        scoringFailures++;
        this.logger.warn(
          `Scoring failed for user=${userId} job=${job.id}: ${(err as Error).message}`,
          CTX,
        );
      }
    }

    if (scoringFailures > 0 && scoringFailures === jobs.length) {
      throw new CuratedSelectorAllScoringFailedException(userId, jobs.length);
    }
    if (scoringFailures > jobs.length / 2) {
      this.logger.error(`Curated selector: ${scoringFailures}/${jobs.length} scoring calls failed for user=${userId} — investigate`, { context: CTX });
    }

    scored.sort((a, b) => b.matchScore - a.matchScore);
    return scored.slice(0, limit);
  }
}
