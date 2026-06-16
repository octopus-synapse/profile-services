import { type Locale, renderQualityIssue } from '@packages/i18n';
import type { SavedQualityScore } from '../../domain/ports/quality-score.repository.port';
import type { ResumeQualityResponseDto } from '../../dto/resume-quality-response.schema';

/** Presenter — projects the domain snapshot into the DTO the HTTP
 * layer returns. Each issue's `code` is localised into `message` via the
 * `QUALITY_ISSUE_DICTIONARY` (Q8 — user-facing 2xx strings come from a
 * dictionary). For `AI_*` codes the dictionary supplies the fixed
 * category label while `freeformMessage` carries the per-bullet detail
 * (already in the resume's language). */
export function toQualitySnapshotResponseDto(
  snapshot: SavedQualityScore,
  locale: Locale = 'en',
): ResumeQualityResponseDto {
  return {
    id: snapshot.id,
    resumeId: snapshot.resumeId,
    overallScore: snapshot.overallScore,
    completenessScore: snapshot.completenessScore,
    contentQualityScore: snapshot.contentQualityScore,
    issues: snapshot.issues.map((i) => ({
      code: i.code,
      severity: i.severity,
      message: renderQualityIssue(
        i.code,
        (i.messageArgs ?? {}) as Record<string, string | number | boolean>,
        locale,
      ),
      messageArgs: i.messageArgs,
      freeformMessage: i.freeformMessage,
      context: i.context,
    })),
    scoringRulesVersion: snapshot.scoringRulesVersion,
    aiPromptVersion: snapshot.aiPromptVersion,
    computedAt: snapshot.computedAt.toISOString(),
  };
}
