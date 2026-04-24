import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeQualityComputedEvent } from '@/bounded-contexts/resume-quality/domain/events';
import { NotificationService } from '../services/notification.service';

/**
 * Plan rank thresholds — F < 40 ≤ D < 60 ≤ C < 70 ≤ B < 80 ≤ A < 90 ≤ S.
 * Returns the rank letter for a given numeric score.
 */
function rankOf(score: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

const RANK_ORDER: ReadonlyArray<'S' | 'A' | 'B' | 'C' | 'D' | 'F'> = ['F', 'D', 'C', 'B', 'A', 'S'];

/**
 * Subscribes to `ResumeQualityComputedEvent` and emits an in-app +
 * email notification when the resume crosses a rank boundary up
 * (`RESUME_QUALITY_IMPROVED`) or down (`RESUME_QUALITY_REGRESSED`).
 *
 * Boundary detection requires the previous snapshot — pulled from
 * `ResumeQualityScoreHistory` ordered by `computedAt desc, offset 1`
 * because the just-saved snapshot is at offset 0. When no prior row
 * exists (first compute) we stay quiet; the user already knows their
 * fresh score from the dashboard.
 */
@Injectable()
export class ResumeQualityRankNotificationHandler {
  private readonly logger = new Logger(ResumeQualityRankNotificationHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  @OnEvent(ResumeQualityComputedEvent.TYPE)
  async handle(event: ResumeQualityComputedEvent): Promise<void> {
    try {
      const previous = await this.prisma.resumeQualityScoreHistory.findMany({
        where: { resumeId: event.payload.resumeId },
        orderBy: { computedAt: 'desc' },
        take: 2,
      });
      // 0 rows: would mean the just-saved snapshot wasn't persisted yet
      // (event ordering issue); 1 row: just-saved is the only snapshot,
      // nothing to compare against.
      if (previous.length < 2) return;

      const newRank = rankOf(event.payload.overallScore);
      const oldRank = rankOf(previous[1]?.overallScore ?? 0);
      if (newRank === oldRank) return;

      const movedUp = RANK_ORDER.indexOf(newRank) > RANK_ORDER.indexOf(oldRank);
      const userId = await this.resumeOwnerId(event.payload.resumeId);
      if (!userId) return;

      await this.notifications.create(
        userId,
        movedUp ? 'RESUME_QUALITY_IMPROVED' : 'RESUME_QUALITY_REGRESSED',
        'system',
        movedUp
          ? `Seu currículo subiu para a faixa ${newRank} (de ${oldRank}).`
          : `Seu currículo caiu para a faixa ${newRank} (de ${oldRank}). Confira as recomendações.`,
        'Resume',
        event.payload.resumeId,
      );
    } catch (err) {
      this.logger.warn(
        `resume-quality rank notification failed for resume=${event.payload.resumeId}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }

  private async resumeOwnerId(resumeId: string): Promise<string | null> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { userId: true },
    });
    return resume?.userId ?? null;
  }
}
