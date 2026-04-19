/**
 * Skill Decay Service
 *
 * Flags skills a user hasn't touched in STALE_AFTER_DAYS days and emits
 * an in-app notification suggesting a small project / course to
 * reactivate them. Idempotent per (user, skill) per calendar quarter via
 * SkillDecayLog — we don't want to nag the same skill every week.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

const STALE_AFTER_DAYS = 120;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface DecayFinding {
  userId: string;
  skillName: string;
  daysSinceTouched: number;
}

@Injectable()
export class SkillDecayService {
  private readonly logger = new Logger(SkillDecayService.name);

  constructor(private readonly prisma: PrismaService) {}

  async scanAndFlag(now: Date = new Date()): Promise<{ scanned: number; flagged: number }> {
    const cutoff = new Date(now.getTime() - STALE_AFTER_DAYS * MS_PER_DAY);
    const quarterKey = this.quarterKey(now);

    const stale = await this.prisma.userSkillProficiency.findMany({
      where: { updatedAt: { lt: cutoff } },
      select: { id: true, userId: true, skillName: true, updatedAt: true },
      take: 5000,
    });

    let flagged = 0;
    for (const row of stale) {
      try {
        const already = await this.prisma['skillDecayLog'].findUnique({
          where: {
            userId_skillName_quarterKey: {
              userId: row.userId,
              skillName: row.skillName,
              quarterKey,
            },
          },
        });
        if (already) continue;

        const days = Math.floor((now.getTime() - row.updatedAt.getTime()) / MS_PER_DAY);
        await this.emit({ userId: row.userId, skillName: row.skillName, daysSinceTouched: days });
        await this.prisma['skillDecayLog'].create({
          data: {
            userId: row.userId,
            skillName: row.skillName,
            quarterKey,
            daysSinceTouched: days,
          },
        });
        flagged += 1;
      } catch (err) {
        this.logger.error(
          `Skill decay flag failed for ${row.userId}/${row.skillName}: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }

    return { scanned: stale.length, flagged };
  }

  private async emit(finding: DecayFinding): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId: finding.userId,
        type: 'SKILL_DECAY',
        message: `Your "${finding.skillName}" skill hasn't moved in ${finding.daysSinceTouched} days — pick a small project or short course to reactivate it.`,
      },
    });
  }

  private quarterKey(date: Date): string {
    const year = date.getUTCFullYear();
    const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
    return `${year}-Q${quarter}`;
  }
}
