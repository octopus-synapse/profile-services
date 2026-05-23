/**
 * ResumeStylesQueryPort
 *
 * Read-side port the onboarding flow uses to list the system resume
 * styles available on the picker step. Replaces the legacy
 * `SystemThemesPort` — the implementation either delegates to the
 * resume-styles BC's `ListStylesUseCase` (when `isSystem=true` is
 * the filter) or talks directly to the persistence layer when the
 * cross-BC use case isn't wired yet. Either way, the only consumer
 * here is the resume-style picker, so the surface is intentionally
 * minimal.
 */

import type { OnboardingResumeStyleOption } from '../config/onboarding-steps.config';

export abstract class ResumeStylesQueryPort {
  abstract listSystemStyles(): Promise<OnboardingResumeStyleOption[]>;
}
