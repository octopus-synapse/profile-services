import { describe, expect, it } from 'bun:test';
import { SECTION_ORDER_KEYS } from '../../../src/bounded-contexts/onboarding/domain/config/onboarding-section-defaults.config';
import { sectionTypes } from '../../../prisma/seeds/section-type.seed';

/**
 * The onboarding flow renders one step per SECTION_ORDER_KEYS entry, pulling
 * every label/field from the catalog (no fallback anymore). So each ordered
 * key MUST be a real, seeded catalog section type — otherwise the onboarding
 * step builder throws at runtime. This ties the flow config to the catalog
 * (which the catalog↔translations parity spec already proves is fully
 * translated), guaranteeing no onboarding step can render untranslated.
 */
describe('i18n onboarding sections parity (SECTION_ORDER_KEYS ↔ catalog)', () => {
  const catalogKeys = new Set(sectionTypes.map((s) => s.key));

  it('every onboarding section key is a real catalog section type', () => {
    const missing = SECTION_ORDER_KEYS.filter((key) => !catalogKeys.has(key));
    expect(
      missing,
      `Onboarding references section types absent from the catalog:\n${missing.join('\n')}\n` +
        `They have no translation source and will throw at runtime.`,
    ).toEqual([]);
  });
});
