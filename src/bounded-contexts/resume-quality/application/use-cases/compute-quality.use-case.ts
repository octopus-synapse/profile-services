import { Injectable, Logger } from '@nestjs/common';
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
@Injectable()
export class ComputeQualityUseCase {
  private readonly logger = new Logger(ComputeQualityUseCase.name);

  constructor(
    private readonly resumeLoader: ResumeLoaderPort,
    private readonly contentQuality: ContentQualityPort,
    private readonly repository: QualityScoreRepositoryPort,
  ) {}

  async execute(resumeId: string): Promise<SavedQualityScore> {
    const resume = await this.resumeLoader.load(resumeId);
    if (!resume) throw new ResumeNotFoundForQualityError(resumeId);

    const completeness = scoreCompleteness(resume);

    let contentQuality;
    try {
      contentQuality = await this.contentQuality.analyze(resume);
    } catch (err) {
      // Graceful degradation — the Port returning null or throwing both
      // land here; we keep going with Completeness alone.
      this.logger.warn(`Content Quality failed for resume ${resumeId}: ${(err as Error).message}`);
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

    return this.repository.save(resumeId, breakdown);
  }

  private blend(completeness: number, contentQuality: number | null): number {
    if (contentQuality === null) return completeness;
    return Math.round(completeness * 0.4 + contentQuality * 0.6);
  }
}
