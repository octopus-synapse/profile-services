/**
 * In-memory `BadgesRepositoryPort` for use case specs. The unique-
 * constraint behavior of the production adapter is faithfully
 * reproduced — re-awarding the same `(userId, kind)` pair returns
 * `awarded: false`.
 */

import type { BadgeKind, Prisma } from '@prisma/client';
import type { AwardedBadge } from '../domain/entities/badge';
import { BadgesRepositoryPort } from '../domain/ports/badges.repository.port';

interface Row extends AwardedBadge {
  readonly userId: string;
}

export class InMemoryBadgesRepository extends BadgesRepositoryPort {
  readonly rows: Row[] = [];
  private acceptedCounts = new Map<string, number>();

  setAcceptedApplications(userId: string, count: number): void {
    this.acceptedCounts.set(userId, count);
  }

  async listForUser(userId: string): Promise<AwardedBadge[]> {
    return this.rows
      .filter((r) => r.userId === userId)
      .sort((a, b) => a.awardedAt.getTime() - b.awardedAt.getTime())
      .map(({ kind, awardedAt, context }) => ({ kind, awardedAt, context }));
  }

  async listForManyUsers(userIds: string[]): Promise<Map<string, BadgeKind[]>> {
    const out = new Map<string, BadgeKind[]>();
    if (userIds.length === 0) return out;
    const set = new Set(userIds);
    for (const r of this.rows) {
      if (!set.has(r.userId)) continue;
      const arr = out.get(r.userId) ?? [];
      arr.push(r.kind);
      out.set(r.userId, arr);
    }
    return out;
  }

  async award(
    userId: string,
    kind: BadgeKind,
    context?: Prisma.InputJsonValue,
  ): Promise<{ awarded: boolean }> {
    if (this.rows.some((r) => r.userId === userId && r.kind === kind)) {
      return { awarded: false };
    }
    this.rows.push({ userId, kind, awardedAt: new Date(), context: context ?? null });
    return { awarded: true };
  }

  async countAcceptedApplications(userId: string): Promise<number> {
    return this.acceptedCounts.get(userId) ?? 0;
  }
}
