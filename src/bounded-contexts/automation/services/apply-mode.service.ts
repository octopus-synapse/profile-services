import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';

export interface WeeklyCuratedBatchView {
  id: string;
  weekOf: string;
  sentAt: string | null;
  status: string;
  items: Array<{
    id: string;
    jobId: string;
    matchScore: number;
    status: string;
    decidedAt: string | null;
  }>;
}

/**
 * Application service for the Weekly Curated apply-mode flow. Owns the
 * persistence operations that the controller needs (fetch current batch,
 * approve/reject items, create applications).
 */
@Injectable()
export class ApplyModeService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentBatch(userId: string): Promise<WeeklyCuratedBatchView | null> {
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
      weekOf: batch.weekOf.toISOString(),
      sentAt: batch.sentAt?.toISOString() ?? null,
      status: batch.status,
      items: batch.items.map(ApplyModeService.toItemView),
    };
  }

  async approve(
    userId: string,
    itemId: string,
  ): Promise<{ applicationId: string; alreadyApplied: boolean }> {
    const item = await this.fetchOwnedItem(itemId, userId);

    // Idempotent — a second approve on the same item just returns the existing
    // application. The UI can call this on retry without double-submitting.
    const existing = await this.prisma.jobApplication.findUnique({
      where: { jobId_userId: { jobId: item.jobId, userId } },
    });
    if (existing) {
      await this.prisma.weeklyCuratedItem.update({
        where: { id: itemId },
        data: { status: 'APPROVED', decidedAt: new Date(), applicationId: existing.id },
      });
      return { applicationId: existing.id, alreadyApplied: true };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { primaryResumeId: true, preferences: { select: { applyCriteria: true } } },
    });

    const created = await this.prisma.jobApplication.create({
      data: {
        jobId: item.jobId,
        userId,
        resumeId: user?.primaryResumeId ?? null,
        coverLetter: user?.preferences?.applyCriteria?.defaultCover ?? null,
      },
    });

    await this.prisma.weeklyCuratedItem.update({
      where: { id: itemId },
      data: { status: 'APPROVED', decidedAt: new Date(), applicationId: created.id },
    });

    return { applicationId: created.id, alreadyApplied: false };
  }

  async reject(userId: string, itemId: string): Promise<void> {
    await this.fetchOwnedItem(itemId, userId);
    await this.prisma.weeklyCuratedItem.update({
      where: { id: itemId },
      data: { status: 'REJECTED', decidedAt: new Date() },
    });
  }

  private async fetchOwnedItem(itemId: string, userId: string) {
    const item = await this.prisma.weeklyCuratedItem.findUnique({
      where: { id: itemId },
      select: { id: true, jobId: true, batch: { select: { userId: true } } },
    });
    if (!item) throw new EntityNotFoundException('WeeklyCuratedItem', itemId);
    if (item.batch.userId !== userId) {
      throw new ForbiddenException('You do not own this item');
    }
    return item;
  }

  private static toItemView(i: {
    id: string;
    jobId: string;
    matchScore: number;
    status: string;
    decidedAt: Date | null;
  }): WeeklyCuratedBatchView['items'][number] {
    return {
      id: i.id,
      jobId: i.jobId,
      matchScore: i.matchScore,
      status: i.status,
      decidedAt: i.decidedAt?.toISOString() ?? null,
    };
  }
}
