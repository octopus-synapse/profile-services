import { Injectable, Logger } from '@nestjs/common';
import { ScoringLlmPort } from '@/bounded-contexts/ai/domain/ports/scoring-llm.port';
import {
  ANALYZE_CONTENT_QUALITY_PROMPT_ID,
  ANALYZE_CONTENT_QUALITY_PROMPT_SEMVER,
  ANALYZE_CONTENT_QUALITY_PROMPT_SHA,
} from '@/bounded-contexts/ai/domain/prompts/analyze-content-quality.v1';
import { FeatureFlagService } from '@/bounded-contexts/platform/feature-flags/application/services/feature-flag.service';
import {
  ContentQualityPort,
  type ContentQualityResult,
} from '../../domain/ports/content-quality.port';
import type { ResumeForCompleteness } from '../../domain/rules/completeness.rules';
import type { IssueCode, QualityIssue } from '../../domain/types';

/** Kill-switch feature flag — flipping this OFF makes the adapter fall
 * back to `null` score, which the use-case already handles by serving
 * Completeness alone. */
const CONTENT_QUALITY_FLAG = 'scoring.content-quality.enabled';

/**
 * Real Content Quality adapter — calls the OpenAI-backed
 * `ScoringLlmPort.analyzeContentQuality` and maps its structured
 * output into the shape `ComputeQualityUseCase` consumes.
 *
 * Degradation strategy: an AI failure (port throws, feature flag off)
 * returns a `null` score; the use-case already blends that as
 * Completeness-only without surfacing an error to the user.
 */
@Injectable()
export class AiContentQualityAdapter extends ContentQualityPort {
  private readonly logger = new Logger(AiContentQualityAdapter.name);

  constructor(
    private readonly scoringLlm: ScoringLlmPort,
    private readonly flags: FeatureFlagService,
  ) {
    super();
  }

  async analyze(resume: ResumeForCompleteness): Promise<ContentQualityResult> {
    if (!(await this.flags.isEnabled(CONTENT_QUALITY_FLAG, null))) {
      return this.empty();
    }

    const bullets = this.collectBullets(resume);
    if (bullets.length === 0) {
      return this.empty();
    }

    try {
      const result = await this.scoringLlm.analyzeContentQuality({
        summary: resume.summary,
        jobTitle: resume.jobTitle,
        bullets,
      });
      return {
        score: result.score,
        issues: result.issues.map(mapAiIssueToQualityIssue),
        promptVersion: `${ANALYZE_CONTENT_QUALITY_PROMPT_ID}@${ANALYZE_CONTENT_QUALITY_PROMPT_SEMVER}#${ANALYZE_CONTENT_QUALITY_PROMPT_SHA}`,
        callsCount: 1,
        // Token counts are tracked; per-token cost USD translation is a
        // follow-up (config value × tokens). Metrics use tokensUsed
        // directly until then.
        costUsdMicros: 0n,
      };
    } catch (err) {
      this.logger.warn(`Content Quality AI call failed: ${(err as Error).message}`);
      return this.empty();
    }
  }

  /**
   * Map the rule layer's minimal resume shape into bullets the prompt
   * understands. The full resume body lives in a richer Prisma graph —
   * that's next-iteration territory; for MVP the summary + experiences
   * list is the signal that moves the content-quality needle most.
   */
  private collectBullets(resume: ResumeForCompleteness): Array<{ id: string; text: string }> {
    const out: Array<{ id: string; text: string }> = [];
    for (let i = 0; i < resume.experiences.length; i++) {
      const exp = resume.experiences[i];
      if (!exp) continue;
      const parts = [exp.role, exp.company].filter(Boolean).join(' · ');
      if (parts) out.push({ id: `exp:${i}`, text: parts });
    }
    return out;
  }

  private empty(): ContentQualityResult {
    return { score: null, issues: [], promptVersion: null, callsCount: 0, costUsdMicros: 0n };
  }
}

function mapAiIssueToQualityIssue(issue: {
  code: 'VAGUE_BULLET' | 'NO_METRIC' | 'WEAK_VERB' | 'OTHER';
  severity: 'low' | 'medium' | 'high';
  freeformMessage: string;
  context?: { bulletId?: string; excerpt?: string };
}): QualityIssue {
  const code: IssueCode =
    issue.code === 'VAGUE_BULLET'
      ? 'AI_VAGUE_BULLET'
      : issue.code === 'NO_METRIC'
        ? 'AI_NO_METRIC'
        : issue.code === 'WEAK_VERB'
          ? 'AI_WEAK_VERB'
          : 'AI_OTHER';
  return {
    code,
    severity: issue.severity,
    freeformMessage: issue.freeformMessage,
    context: issue.context
      ? {
          sectionKey: issue.context.bulletId ? 'experience' : undefined,
          excerpt: issue.context.excerpt,
        }
      : undefined,
  };
}
