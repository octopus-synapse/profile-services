/**
 * Prisma adapter for `RageApplyRepositoryPort`.
 *
 * Owns the user snapshot projection and the unique-constraint dedupe
 * behind `JobApplication(jobId, userId)`. The legacy
 * `RageApplyService` did these reads inline against `PrismaService`;
 * this adapter keeps that behaviour exactly while moving the SQL
 * shapes off the use case.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import type { RageApplyUserSnapshot } from '../../../domain/entities/rage-apply';
import {
  type CreateApplicationInput,
  RageApplyRepositoryPort,
} from '../../../domain/ports/rage-apply.repository.port';

const CTX = 'PrismaRageApplyRepository';

export class PrismaRageApplyRepository extends RageApplyRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async findUserSnapshot(userId: string): Promise<RageApplyUserSnapshot | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isActive: true,
        primaryResumeId: true,
        preferences: { select: { applyCriteria: true } },
      },
    });
    if (!user) return null;
    return {
      isActive: user.isActive,
      primaryResumeId: user.primaryResumeId,
      applyCriteria: user.preferences?.applyCriteria ?? null,
    };
  }

  async findExistingApplication(jobId: string, userId: string): Promise<boolean> {
    const existing = await this.prisma.jobApplication.findUnique({
      where: { jobId_userId: { jobId, userId } },
      select: { id: true },
    });
    return existing !== null;
  }

  async createApplication(input: CreateApplicationInput): Promise<void> {
    try {
      await this.prisma.jobApplication.create({
        data: {
          jobId: input.jobId,
          userId: input.userId,
          resumeId: input.resumeId,
          tailoredVersionId: input.tailoredVersionId,
          coverLetter: input.coverLetter,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to create JobApplication for user=${input.userId} job=${input.jobId}: ${(err as Error).message}`,
        CTX,
      );
      throw err;
    }
  }
}
