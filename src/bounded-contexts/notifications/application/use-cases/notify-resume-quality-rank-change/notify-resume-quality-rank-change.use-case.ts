/**
 * Emits a `RESUME_QUALITY_IMPROVED` / `RESUME_QUALITY_REGRESSED`
 * notification when a fresh quality computation crosses a rank
 * boundary.
 *
 * Boundary detection requires the previous snapshot — we ask the port
 * for the two most recent rows ordered by `computedAt desc`. The
 * just-saved snapshot is at index 0; the prior one (the comparison
 * basis) at index 1. When fewer than two snapshots exist we stay
 * quiet — first-time scores are surfaced through the dashboard, not
 * via a "you regressed from F to F" email.
 */

import type { LoggerPort } from '@/shared-kernel';
import { ResumeQualitySnapshotPort } from '../../../domain/ports/resume-quality-snapshot.port';
import { CreateNotificationUseCase } from '../create-notification/create-notification.use-case';

const CTX = 'NotifyResumeQualityRankChangeUseCase';
const SYSTEM_ACTOR = 'system';

type Rank = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
const RANK_ORDER: ReadonlyArray<Rank> = ['F', 'D', 'C', 'B', 'A', 'S'];

function rankOf(score: number): Rank {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export interface NotifyResumeQualityRankInput {
  readonly resumeId: string;
  readonly overallScore: number;
}

export class NotifyResumeQualityRankChangeUseCase {
  constructor(
    private readonly snapshots: ResumeQualitySnapshotPort,
    private readonly createNotification: CreateNotificationUseCase,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: NotifyResumeQualityRankInput): Promise<void> {
    try {
      const recent = await this.snapshots.findRecentSnapshots(input.resumeId, 2);
      // 0 rows: would mean the just-saved snapshot wasn't persisted
      // yet (event ordering issue); 1 row: nothing to compare against.
      if (recent.length < 2) return;

      const newRank = rankOf(input.overallScore);
      const oldRank = rankOf(recent[1]?.overallScore ?? 0);
      if (newRank === oldRank) return;

      const movedUp = RANK_ORDER.indexOf(newRank) > RANK_ORDER.indexOf(oldRank);
      const userId = await this.snapshots.findResumeOwnerId(input.resumeId);
      if (!userId) return;

      await this.createNotification.execute({
        userId,
        type: movedUp ? 'RESUME_QUALITY_IMPROVED' : 'RESUME_QUALITY_REGRESSED',
        actorId: SYSTEM_ACTOR,
        message: movedUp
          ? `Seu currículo subiu para a faixa ${newRank} (de ${oldRank}).`
          : `Seu currículo caiu para a faixa ${newRank} (de ${oldRank}). Confira as recomendações.`,
        entityType: 'Resume',
        entityId: input.resumeId,
      });
    } catch (err) {
      this.logger.warn(
        `resume-quality rank notification failed for resume=${input.resumeId}: ${err instanceof Error ? err.message : 'unknown'}`,
        CTX,
      );
    }
  }
}
