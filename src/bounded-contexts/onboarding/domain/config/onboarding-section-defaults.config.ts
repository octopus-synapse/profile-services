/** Section step order — which sections to show in onboarding */
export const SECTION_ORDER_KEYS = [
  'work_experience_v1',
  'education_v1',
  'skill_set_v1',
  'soft_skill_set_v1',
  'language_v1',
  'project_v1',
  'certification_v1',
  'award_v1',
  'publication_v1',
] as const;

/**
 * Core section steps — always visible in the linear flow regardless of the
 * user's opt-in choice. The redesigned onboarding keeps only the résumé
 * spine here (work history + education); everything else is surfaced from
 * the review hub via the "add section" gate.
 */
export const CORE_SECTION_KEYS = ['work_experience_v1', 'education_v1'] as const;

/**
 * Extra section steps — only rendered after the user opts into them via
 * the review hub's "add section" gate (`activatedExtras` on
 * `OnboardingProgress`). Listed here in the canonical display order. Use
 * the `extraStepKey('project_v1')` helper to derive the matching
 * `OnboardingStep.key`.
 *
 * Skills (technical + behavioural) and spoken languages live here too: the
 * redesigned flow offers them as opt-in sections in the review hub rather
 * than forcing them into the linear spine.
 */
export const EXTRA_SECTION_KEYS = [
  'skill_set_v1',
  'soft_skill_set_v1',
  'language_v1',
  'project_v1',
  'certification_v1',
  'award_v1',
  'publication_v1',
] as const;

/** Convert a section type key (`project_v1`) to its step key (`section:project_v1`). */
export function extraStepKey(sectionTypeKey: string): string {
  return `section:${sectionTypeKey}`;
}
