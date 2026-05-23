/**
 * Static guard: every `OnboardingStep.component` value used in the
 * runtime branches (mapper, strength scorer, presenter, validation
 * rules) must also be declared in the seed, and vice-versa. Drift
 * between the two means a step can silently no-op for users — the
 * exact failure mode that hid for months when the legacy `template`
 * step's mapper case was never updated after the resume-style
 * refactor.
 *
 * This spec is loud on purpose: a missing branch surfaces here in
 * CI instead of as a blank screen at the picker step.
 */

import { describe, expect, it } from 'bun:test';

// Seed source of truth — what the DB actually carries after
// `bun run db:setup:test`.
import { steps as seedSteps } from '../../../prisma/seeds/onboarding-step.seed';

/**
 * Components the runtime knows how to handle. Anything in the seed
 * NOT listed here is a silent no-op (mapper falls through, strength
 * scorer returns false, presenter doesn't inject `data`).
 *
 * Sources of truth (keep this in lockstep when adding a step type):
 *   - `onboarding-step-data.mapper.ts` (mergeStaticStepData switch)
 *   - `onboarding-strength.ts` (isStepFilled switch)
 *   - `onboarding-validation.rules.ts` (welcome/complete/review skip)
 *   - `onboarding.presenter.ts` (resume-style data injection)
 *   - `onboarding-steps.config.ts` (generic-section synthesis)
 */
const KNOWN_COMPONENTS = new Set([
  'welcome',
  'personal-info',
  'username',
  'professional-profile',
  'extras-gate',
  'generic-section',
  'resume-style',
  'review',
  'complete',
]);

describe('onboarding step components — seed ↔ runtime parity', () => {
  it('every seeded step.component is recognized by the runtime', () => {
    const unknown = seedSteps
      .map((s) => ({ key: s.key, component: s.component }))
      .filter((s) => !KNOWN_COMPONENTS.has(s.component));

    expect(
      unknown,
      `seed defines step.component values that no runtime branch handles:\n` +
        unknown.map((u) => `  - ${u.key} → component=${u.component}`).join('\n') +
        `\n\nKNOWN_COMPONENTS = ${Array.from(KNOWN_COMPONENTS).join(', ')}`,
    ).toEqual([]);
  });

  it('every step key is unique in the seed (DB upsert keys on it)', () => {
    const counts = new Map<string, number>();
    for (const s of seedSteps) counts.set(s.key, (counts.get(s.key) ?? 0) + 1);
    const dupes = Array.from(counts.entries()).filter(([, n]) => n > 1);
    expect(dupes, `Duplicate step keys: ${JSON.stringify(dupes)}`).toEqual([]);
  });

  it('legacy "template" step is gone (resume-style took its place)', () => {
    // Belt-and-suspenders for the resume-style canonical refactor: if
    // someone re-introduces the old key the rest of the suite would
    // limp along (mapper case-falls-through, picker shows blank) until
    // a user complains. This makes the regression noisy at CI time.
    expect(seedSteps.find((s) => s.key === 'template')).toBeUndefined();
    expect(seedSteps.find((s) => s.component === 'template')).toBeUndefined();
  });
});
