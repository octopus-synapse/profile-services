import type { ResumeEventPublisher } from '../../../../domain/ports';

/** Encodes a section-item mutation as a `ResumeUpdatedEvent` changedField
 * token (`sections:<semanticKind>`), so downstream listeners (resume
 * quality) can tell *which kind* of content changed and decide whether an
 * AI recompute is warranted. */
export function sectionChangedField(semanticKind: string): string {
  return `sections:${semanticKind}`;
}

/**
 * Publishes a `ResumeUpdatedEvent` for a section-item create/update/delete
 * so the resume-quality recompute fires when bullets change. No-op when no
 * publisher is wired (e.g. unit tests that don't care about events).
 */
export function publishSectionContentChange(
  eventPublisher: ResumeEventPublisher | undefined,
  resumeId: string,
  userId: string,
  semanticKind: string,
): void {
  eventPublisher?.publishResumeUpdated(resumeId, {
    userId,
    changedFields: [sectionChangedField(semanticKind)],
  });
}
