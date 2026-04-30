/**
 * Minimal "does this resume exist?" probe. The Match orchestrator needs
 * nothing else from the resume entity itself (keywords come from
 * `ResumeKeywordSourcePort`; section-level data only lives on the AI
 * path). Keeping this port trivial avoids reaching into `resume-quality`
 * or `resumes/` just for an existence check.
 */
export abstract class ResumeExistencePort {
  abstract exists(resumeId: string): Promise<boolean>;
}
