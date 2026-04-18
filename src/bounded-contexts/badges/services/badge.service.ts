import { Injectable, Logger } from '@nestjs/common';
import type { BadgeKind, Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

/**
 * Central badge awarding service. Every unlock funnels through here so we
 * keep the rules in one file — the idempotent `@@unique([userId, kind])`
 * constraint makes awarding safe to call multiple times from event handlers.
 */
@Injectable()
export class BadgeService {
  private readonly logger = new Logger(BadgeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    return this.prisma.userBadge.findMany({
      where: { userId },
      orderBy: { awardedAt: 'asc' },
      select: { kind: true, awardedAt: true, context: true },
    });
  }

  async listForUserAsDto(userId: string): Promise<Array<{ kind: string; awardedAt: string }>> {
    const rows = await this.listForUser(userId);
    return rows.map((r) => ({ kind: r.kind, awardedAt: r.awardedAt.toISOString() }));
  }

  async listForManyUsers(userIds: string[]) {
    if (userIds.length === 0) return new Map<string, BadgeKind[]>();
    const rows = await this.prisma.userBadge.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, kind: true },
    });
    const byUser = new Map<string, BadgeKind[]>();
    for (const r of rows) {
      const arr = byUser.get(r.userId) ?? [];
      arr.push(r.kind);
      byUser.set(r.userId, arr);
    }
    return byUser;
  }

  /** Idempotent: awarding a kind a user already has is a no-op. */
  async award(
    userId: string,
    kind: BadgeKind,
    context?: Prisma.InputJsonValue,
  ): Promise<{ awarded: boolean }> {
    try {
      await this.prisma.userBadge.create({
        data: { userId, kind, context },
      });
      this.logger.log(`Awarded ${kind} to ${userId}`);
      return { awarded: true };
    } catch (err) {
      // Unique constraint violation → already owned.
      if ((err as { code?: string }).code === 'P2002') {
        return { awarded: false };
      }
      throw err;
    }
  }

  // ---- Triggers invoked from the rest of the app ----

  async onPostCreated(userId: string, postType: string): Promise<void> {
    if (postType === 'BUILD') {
      await this.award(userId, 'FIRST_BUILD');
    }
  }

  async onAtsScoreCalculated(userId: string, score: number): Promise<void> {
    if (score >= 90) {
      await this.award(userId, 'ATS_90_PLUS', { score });
    }
  }

  async onInterviewScheduled(userId: string): Promise<void> {
    // Award after 5 interviews. We count JobApplications in INTERVIEW status.
    const count = await this.prisma.jobApplication.count({
      where: { userId, status: 'ACCEPTED' },
    });
    if (count >= 5) {
      await this.award(userId, 'INTERVIEWS_5', { count });
    }
  }
}
