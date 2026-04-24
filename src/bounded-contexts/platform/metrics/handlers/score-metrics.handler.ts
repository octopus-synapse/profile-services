import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MatchComputedEvent } from '@/bounded-contexts/job-match/domain/events';
import { ResumeQualityComputedEvent } from '@/bounded-contexts/resume-quality/domain/events';
import { MetricsService } from '../metrics.service';

/**
 * Single subscriber that turns scoring `*ComputedEvent`s into the two
 * Prometheus signals the SLO board cares about — a counter sliced by
 * outcome and a duration histogram — plus a structured log line per
 * computation for ad-hoc auditing.
 *
 * Outcome heuristic:
 *   - resume_quality: `partial` when Content Quality fell back to null.
 *   - match: `partial` when any sub-score is null (provider degraded).
 *   - `failed` is reserved for thrown executions and isn't observable
 *     here — the use case throws before publishing. A future workers-
 *     level handler can emit `failed` from BullMQ job-failed events.
 */
@Injectable()
export class ScoreMetricsHandler {
  private readonly logger = new Logger(ScoreMetricsHandler.name);

  constructor(private readonly metrics: MetricsService) {}

  @OnEvent(ResumeQualityComputedEvent.TYPE)
  onResumeQualityComputed(event: ResumeQualityComputedEvent): void {
    const outcome = event.payload.contentQualityScore === null ? 'partial' : 'success';
    this.metrics.incrementScoreComputed({ type: 'resume_quality', outcome });
    this.metrics.observeScoreComputeDuration(event.payload.durationMs / 1000, {
      type: 'resume_quality',
    });
    this.logger.log(
      JSON.stringify({
        scoreType: 'resume_quality',
        resumeId: event.payload.resumeId,
        snapshotId: event.payload.snapshotId,
        value: event.payload.overallScore,
        completeness: event.payload.completenessScore,
        contentQuality: event.payload.contentQualityScore,
        issuesCount: event.payload.issuesCount,
        highSeverityCount: event.payload.highSeverityCount,
        aiCallsCount: event.payload.aiCallsCount,
        costUsdMicros: event.payload.costUsdMicros.toString(),
        durationMs: event.payload.durationMs,
        outcome,
      }),
    );
  }

  @OnEvent(MatchComputedEvent.TYPE)
  onMatchComputed(event: MatchComputedEvent): void {
    const sub = event.payload.subScores;
    const anyNull =
      sub.keyword === null ||
      sub.requirements === null ||
      sub.semantic === null ||
      sub.fit === null;
    const outcome = anyNull ? 'partial' : 'success';
    this.metrics.incrementScoreComputed({ type: 'match', outcome });
    this.metrics.observeScoreComputeDuration(event.payload.durationMs / 1000, { type: 'match' });
    this.logger.log(
      JSON.stringify({
        scoreType: 'match',
        userId: event.payload.userId,
        resumeId: event.payload.resumeId,
        jobId: event.payload.jobId,
        value: event.payload.overallScore,
        subScores: sub,
        fromCache: event.payload.fromCache,
        durationMs: event.payload.durationMs,
        outcome,
      }),
    );
  }
}
