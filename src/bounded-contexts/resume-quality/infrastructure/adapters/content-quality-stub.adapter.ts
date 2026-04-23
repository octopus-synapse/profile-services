import { Injectable } from '@nestjs/common';
import {
  ContentQualityPort,
  type ContentQualityResult,
} from '../../domain/ports/content-quality.port';
import type { ResumeForCompleteness } from '../../domain/rules/completeness.rules';

/**
 * Placeholder Content Quality adapter — returns a fixed moderate score
 * and emits zero issues. The real implementation (LLM call against the
 * `content-quality.v1.md` prompt) lands with the `ai/` port in Task #19;
 * this stub exists to keep the use-case wireable and the DB schema
 * exercised end-to-end without depending on an API key at boot.
 *
 * Gate it behind `scoring.content-quality.enabled` at the module so
 * turning the kill-switch off yields a `null` score (Completeness-only
 * fallback in the use-case) rather than a fake number that could mislead
 * product decisions.
 */
@Injectable()
export class ContentQualityStubAdapter extends ContentQualityPort {
  async analyze(_resume: ResumeForCompleteness): Promise<ContentQualityResult> {
    return {
      score: 75,
      issues: [],
      promptVersion: null,
      callsCount: 0,
      costUsdMicros: 0n,
    };
  }
}
