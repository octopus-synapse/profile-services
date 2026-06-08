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

/** The render-relevant slice of a `ResumeStyle` for the live preview. */
export interface OnboardingPreviewStyle {
  /** DSL `styleConfig` (tokens + layout) overlaid onto the preview DSL. */
  styleConfig: unknown;
  /** Hardcoded template mirror to use — `'default'` or `'ats'`. */
  typstTemplate: string;
}

export abstract class ResumeStylesQueryPort {
  abstract listSystemStyles(): Promise<OnboardingResumeStyleOption[]>;

  /** Load a system style's render config by id, or `null` if it isn't a
   *  system style (the picker only ever previews system styles). */
  abstract findStyleForPreview(id: string): Promise<OnboardingPreviewStyle | null>;
}
