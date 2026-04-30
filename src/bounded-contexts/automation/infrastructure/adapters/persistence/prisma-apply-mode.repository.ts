/**
 * Prisma adapter for `ApplyModeRepositoryPort`. Wraps the read/write
 * surface that the apply-mode use cases need: weekly-curated batches,
 * weekly-curated items, JobApplication idempotency lookup + creation,
 * and the user's primary-resume + default cover-letter defaults.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import type {
  ApplyModeUserDefaults,
  JobApplicationRow,
  OwnedWeeklyCuratedItem,
  WeeklyCuratedBatchRow,
} from '../../../domain/entities/weekly-curated-item';
import {
  ApplyModeRepositoryPort,
  type CreateJobApplicationInput,
  type UpdateItemDecisionInput,
} from '../../../domain/ports/apply-mode.repository.port';

const CTX = 'PrismaApplyModeRepository';

export class PrismaApplyModeRepository extends ApplyModeRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async findCurrentBatchForUser(userId: string): Promise<WeeklyCuratedBatchRow | null> {
    const batch = await this.prisma.weeklyCuratedBatch.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { orderBy: { matchScore: 'desc' } },
      },
    });
    if (!batch) return null;
    return {
      id: batch.id,
      weekOf: batch.weekOf,
      sentAt: batch.sentAt,
      status: batch.status,
      items: batch.items.map((i) => ({
        id: i.id,
        jobId: i.jobId,
        matchScore: i.matchScore,
        status: i.status,
        decidedAt: i.decidedAt,
      })),
    };
  }

  async findItemWithOwner(itemId: string): Promise<OwnedWeeklyCuratedItem | null> {
    const item = await this.prisma.weeklyCuratedItem.findUnique({
      where: { id: itemId },
      select: { id: true, jobId: true, batch: { select: { userId: true } } },
    });
    if (!item) return null;
    return { id: item.id, jobId: item.jobId, userId: item.batch.userId };
  }

  async findApplication(jobId: string, userId: string): Promise<JobApplicationRow | null> {
    const existing = await this.prisma.jobApplication.findUnique({
      where: { jobId_userId: { jobId, userId } },
      select: { id: true },
    });
    return existing ? { id: existing.id } : null;
  }

  async getUserApplicationDefaults(userId: string): Promise<ApplyModeUserDefaults> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { primaryResumeId: true, preferences: { select: { applyCriteria: true } } },
    });
    const applyCriteria = user?.preferences?.applyCriteria as
      | { defaultCover?: string | null }
      | null
      | undefined;
    return {
      primaryResumeId: user?.primaryResumeId ?? null,
      defaultCover: applyCriteria?.defaultCover ?? null,
    };
  }

  async createApplication(input: CreateJobApplicationInput): Promise<JobApplicationRow> {
    const created = await this.prisma.jobApplication.create({
      data: {
        jobId: input.jobId,
        userId: input.userId,
        resumeId: input.resumeId,
        coverLetter: input.coverLetter,
      },
      select: { id: true },
    });
    this.logger.log(`Created JobApplication ${created.id} for user=${input.userId}`, CTX);
    return { id: created.id };
  }

  async updateItemDecision(itemId: string, input: UpdateItemDecisionInput): Promise<void> {
    await this.prisma.weeklyCuratedItem.update({
      where: { id: itemId },
      data: {
        status: input.status,
        decidedAt: input.decidedAt,
        ...(input.applicationId ? { applicationId: input.applicationId } : {}),
      },
    });
  }
}
