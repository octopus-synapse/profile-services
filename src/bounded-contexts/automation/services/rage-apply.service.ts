/**
 * Rage Apply
 *
 * Big-red-button orchestrator: pick every job above `minFit`, AI-tailor
 * a variant for each, submit a JobApplication. Bounded by `maxApplications`
 * so a slip of the finger doesn't send 500 CVs. Reuses the same tailoring
 * + application code paths as the scheduled auto-apply worker so success
 * metrics remain apples-to-apples.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeTailorService } from '@/bounded-contexts/resumes/resume-versions/services/resume-tailor/resume-tailor.service';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { CuratedSelectorService } from './curated-selector.service';

export interface RageApplyInput {
  userId: string;
  minFit?: number;
  maxApplications?: number;
  since?: Date;
}

export interface RageApplyResult {
  attempted: number;
  submitted: number;
  skippedExisting: number;
  failed: Array<{ jobId: string; reason: string }>;
}

const DEFAULT_MIN_FIT = 80;
const DEFAULT_MAX_APPLICATIONS = 20;
const DEFAULT_SINCE_DAYS = 7;

@Injectable()
export class RageApplyService {
  private readonly logger = new Logger(RageApplyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly selector: CuratedSelectorService,
    private readonly tailor: ResumeTailorService,
  ) {}

  async execute(input: RageApplyInput): Promise<RageApplyResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        primaryResumeId: true,
        preferences: { select: { applyCriteria: true } },
      },
    });
    if (!user?.primaryResumeId) {
      throw new EntityNotFoundException('Resume', 'primary');
    }

    const minFit = input.minFit ?? user.preferences?.applyCriteria?.minFit ?? DEFAULT_MIN_FIT;
    const maxApps = Math.min(input.maxApplications ?? DEFAULT_MAX_APPLICATIONS, 100);
    const since = input.since ?? new Date(Date.now() - DEFAULT_SINCE_DAYS * 24 * 60 * 60 * 1000);

    const picks = await this.selector.selectForUser({
      userId: input.userId,
      since,
      minFit,
      limit: maxApps,
    });

    const result: RageApplyResult = {
      attempted: picks.length,
      submitted: 0,
      skippedExisting: 0,
      failed: [],
    };

    for (const pick of picks) {
      try {
        const existing = await this.prisma.jobApplication.findUnique({
          where: { jobId_userId: { jobId: pick.jobId, userId: input.userId } },
        });
        if (existing) {
          result.skippedExisting += 1;
          continue;
        }

        const tailored = await this.tailor.tailorForJob({
          resumeId: user.primaryResumeId,
          userId: input.userId,
          jobId: pick.jobId,
        });

        await this.prisma.jobApplication.create({
          data: {
            jobId: pick.jobId,
            userId: input.userId,
            resumeId: user.primaryResumeId,
            tailoredVersionId: tailored.versionId,
            coverLetter: tailored.summary ?? user.preferences?.applyCriteria?.defaultCover ?? null,
          },
        });
        result.submitted += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown';
        result.failed.push({ jobId: pick.jobId, reason: message });
        this.logger.warn(`Rage-apply failed for job=${pick.jobId}: ${message}`);
      }
    }

    return result;
  }
}
