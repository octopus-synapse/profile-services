import type { SavedQualityScore } from '../../domain/ports/quality-score.repository.port';
import type { ResumeQualityResponseDto } from '../../dto/resume-quality-response.schema';

/** Presenter — projects the domain snapshot into the DTO the HTTP
 * layer returns. Kept out of the controller so the controller stays
 * "thin" per the architecture tests (no `.map`, no transformations). */
export function toQualitySnapshotResponseDto(
  snapshot: SavedQualityScore,
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
      messageArgs: i.messageArgs,
      freeformMessage: i.freeformMessage,
      context: i.context,
    })),
    scoringRulesVersion: snapshot.scoringRulesVersion,
    aiPromptVersion: snapshot.aiPromptVersion,
    computedAt: snapshot.computedAt.toISOString(),
  };
}
