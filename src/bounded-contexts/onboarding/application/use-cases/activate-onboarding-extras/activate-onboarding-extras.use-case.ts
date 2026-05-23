import {
  EXTRA_SECTION_KEYS,
  extraStepKey,
} from '../../../domain/config/onboarding-section-defaults.config';
import { OnboardingUnknownStepException } from '../../../domain/exceptions/onboarding-extra.exceptions';
import { OnboardingProgressRepositoryPort } from '../../../domain/ports/onboarding-progress.port';

const ALLOWED_EXTRA_KEYS: ReadonlySet<string> = new Set(
  EXTRA_SECTION_KEYS.map((k) => extraStepKey(k)),
);

/**
 * Persists the user's "what else?" gate selection. The presenter uses
 * this list to decide which optional extra steps (projects,
 * certifications, awards, publications) appear in the stepper. Always
 * overwrites — passing an empty array clears every extra.
 *
 * Each entry MUST be a known extra step key (e.g.
 * `section:project_v1`); unknown keys raise
 * `OnboardingUnknownStepException` so a stale frontend can't widen the
 * flow with arbitrary identifiers.
 */
export class ActivateOnboardingExtrasUseCase {
  constructor(private readonly repository: OnboardingProgressRepositoryPort) {}

  async execute(userId: string, extras: string[]): Promise<void> {
    // Normalize before validating so casing/whitespace differences from the
    // wire (e.g. "Section:Project_V1") don't slip through and break the
    // presenter when it tries to render the step.
    const normalized = extras.map((k) => k.trim().toLowerCase());
    for (const key of normalized) {
      if (!ALLOWED_EXTRA_KEYS.has(key)) {
        throw new OnboardingUnknownStepException(key);
      }
    }
    await this.repository.setActivatedExtras(userId, normalized);
  }
}
