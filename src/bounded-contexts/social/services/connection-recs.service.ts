/**
 * Connection Recommendations
 *
 * Returns users the viewer most likely wants to follow, ranked by skill
 * overlap. Pure read-only endpoint — no side effects, no writes — so it
 * can be cached at the edge and paginated cheaply.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

export interface ConnectionRecommendation {
  userId: string;
  name: string | null;
  username: string | null;
  sharedSkills: string[];
  overlapScore: number;
}

@Injectable()
export class ConnectionRecsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecommendationsFor(
    viewerId: string,
    options: { limit?: number } = {},
  ): Promise<ConnectionRecommendation[]> {
    const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);

    const viewerSkills = await this.collectSkills(viewerId);
    if (viewerSkills.length === 0) return [];

    const [followed, pendingConnections] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: viewerId },
        select: { followingId: true },
      }),
      this.prisma.connection.findMany({
        where: { OR: [{ requesterId: viewerId }, { targetId: viewerId }] },
        select: { requesterId: true, targetId: true },
      }),
    ]);

    const excluded = new Set<string>([viewerId]);
    for (const f of followed) excluded.add(f.followingId);
    for (const c of pendingConnections) {
      excluded.add(c.requesterId);
      excluded.add(c.targetId);
    }

    // Pull all users who share at least one skill with the viewer in one query.
    const viewerSkillSet = new Set(viewerSkills);
    const candidates = await this.prisma.userSkillProficiency.findMany({
      where: {
        skillName: { in: [...viewerSkillSet] },
        userId: { notIn: [...excluded] },
      },
      select: {
        userId: true,
        skillName: true,
        user: { select: { id: true, name: true, username: true } },
      },
      take: 5000,
    });

    const byUser = new Map<
      string,
      { user: { id: string; name: string | null; username: string | null }; shared: Set<string> }
    >();
    for (const row of candidates) {
      const bucket = byUser.get(row.userId) ?? {
        user: row.user,
        shared: new Set<string>(),
      };
      bucket.shared.add(row.skillName);
      byUser.set(row.userId, bucket);
    }

    const ranked: ConnectionRecommendation[] = [];
    for (const [userId, entry] of byUser.entries()) {
      const shared = [...entry.shared];
      const overlapScore = shared.length / viewerSkills.length;
      ranked.push({
        userId,
        name: entry.user.name,
        username: entry.user.username,
        sharedSkills: shared,
        overlapScore: Number(overlapScore.toFixed(3)),
      });
    }

    ranked.sort((a, b) => b.sharedSkills.length - a.sharedSkills.length);
    return ranked.slice(0, limit);
  }

  private async collectSkills(userId: string): Promise<string[]> {
    const rows = await this.prisma.userSkillProficiency.findMany({
      where: { userId },
      select: { skillName: true },
    });
    return rows.map((r) => r.skillName);
  }
}
