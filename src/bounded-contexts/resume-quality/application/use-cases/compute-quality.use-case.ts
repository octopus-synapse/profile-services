import { EventPublisher, LoggerPort } from '@/shared-kernel';
import { ResumeQualityComputedEvent, summariseIssues } from '../../domain/events';
import { ContentQualityPort } from '../../domain/ports/content-quality.port';
import {
  QualityScoreRepositoryPort,
  type SavedQualityScore,
} from '../../domain/ports/quality-score.repository.port';
import { ResumeLoaderPort } from '../../domain/ports/resume-loader.port';
import { scoreCompleteness } from '../../domain/rules/completeness.rules';
import {
  COMPLETENESS_RULES_VERSION,
  type QualityBreakdown,
  type QualityIssue,
} from '../../domain/types';

export class ResumeNotFoundForQualityError extends Error {
  constructor(public readonly resumeId: string) {
    super(`Resume not found for quality computation: ${resumeId}`);
    this.name = 'ResumeNotFoundForQualityError';
  }
}

/**
 * Orchestrator for the Resume Quality Score. Runs the deterministic
 * Completeness rules synchronously, then asks the Content Quality port
 * for an AI-backed opinion. Both halves compose into a single snapshot
 * that is appended to `ResumeQualityScoreHistory`; the latest row per
 * resume is what the read API serves.
 *
 * Overall = 40% Completeness + 60% Content Quality when both are
 * available; if Content Quality is unavailable the overall falls back
 * to the Completeness score alone so the user still gets a useful
 * signal when the AI provider is down or the kill-switch is off.
 */
export class ComputeQualityUseCase {
  constructor(
    private readonly resumeLoader: ResumeLoaderPort,
    private readonly contentQuality: ContentQualityPort,
    private readonly repository: QualityScoreRepositoryPort,
    private readonly events: EventPublisher,
    private readonly logger: LoggerPort,
  ) {}

  async execute(resumeId: string): Promise<SavedQualityScore> {
    const startedAt = Date.now();
    const resume = await this.resumeLoader.load(resumeId);
    if (!resume) throw new ResumeNotFoundForQualityError(resumeId);

    const completeness = scoreCompleteness(resume);

    let contentQuality: Awaited<ReturnType<typeof this.contentQuality.analyze>> | null = null;
    try {
      contentQuality = await this.contentQuality.analyze(resume);
    } catch (err) {
      // Graceful degradation — the Port returning null or throwing both
      // land here; we keep going with Completeness alone.
      this.logger.warn(
        `Content Quality failed for resume ${resumeId}: ${(err as Error).message}`,
        'ComputeQualityUseCase',
      );
      contentQuality = {
        score: null,
        issues: [] as readonly QualityIssue[],
        promptVersion: null,
        callsCount: 0,
        costUsdMicros: 0n,
      };
    }

    const overall = this.blend(completeness.score, contentQuality.score);

    const breakdown: QualityBreakdown = {
      overallScore: overall,
      completenessScore: completeness.score,
      contentQualityScore: contentQuality.score,
      issues: [...completeness.issues, ...contentQuality.issues],
      scoringRulesVersion: COMPLETENESS_RULES_VERSION,
      aiPromptVersion: contentQuality.promptVersion,
      aiCallsCount: contentQuality.callsCount,
      costUsdMicros: contentQuality.costUsdMicros,
    };

    const saved = await this.repository.save(resumeId, breakdown);

    // P2-#7: await so a failed projection / notification handler surfaces.
    await this.events.publishAsync(
      new ResumeQualityComputedEvent(resumeId, {
        resumeId,
        snapshotId: saved.id,
        overallScore: saved.overallScore,
        completenessScore: saved.completenessScore,
        contentQualityScore: saved.contentQualityScore,
        scoringRulesVersion: saved.scoringRulesVersion,
        aiPromptVersion: saved.aiPromptVersion,
        ...summariseIssues(saved.issues),
        durationMs: Date.now() - startedAt,
        costUsdMicros: saved.costUsdMicros,
        aiCallsCount: saved.aiCallsCount,
      }),
    );

    return saved;
  }

  private blend(completeness: number, contentQuality: number | null): number {
    if (contentQuality === null) return completeness;
    return Math.round(completeness * 0.4 + contentQuality * 0.6);
  }
}
