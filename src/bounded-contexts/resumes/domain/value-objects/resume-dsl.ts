/**
 * Resume DSL V2 Value Object
 *
 * Defines the structure that lives on the Resume.dsl JSON field.
 * In the new architecture, the Resume owns its structure:
 * which sections, in what order, and visibility.
 *
 * @principle Single Source of Truth
 */

import { z } from 'zod';

const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
const CURRENT_VERSION = '2.0.0';

// ============================================================================
// Schema
// ============================================================================

const SectionEntrySchema = z.object({
  sectionTypeKey: z.string().min(1, 'sectionTypeKey must not be empty'),
  order: z.number().int().nonnegative(),
  visible: z.boolean(),
});

export type SectionEntry = z.infer<typeof SectionEntrySchema>;

export const ResumeDslV2Schema = z
  .object({
    version: z.string().regex(SEMVER_PATTERN, 'version must match semver (e.g. "2.0.0")'),
    sections: z.array(SectionEntrySchema),
    headerOverrides: z
      .object({
        jobTitle: z.string().optional(),
      })
      .optional(),
  })
  .refine(
    (dsl) => {
      const orders = dsl.sections.map((s) => s.order);
      return new Set(orders).size === orders.length;
    },
    { message: 'Section orders must be unique', path: ['sections'] },
  );

export type ResumeDslV2 = z.infer<typeof ResumeDslV2Schema>;

// ============================================================================
// Factory
// ============================================================================

/**
 * Creates a default DSL from a list of section type keys.
 * All sections are visible, ordered sequentially starting at 0.
 */
export function buildDefaultDsl(sectionKeys: string[]): ResumeDslV2 {
  return {
    version: CURRENT_VERSION,
    sections: sectionKeys.map((key, index) => ({
      sectionTypeKey: key,
      order: index,
      visible: true,
    })),
  };
}

// ============================================================================
// Merge
// ============================================================================

/**
 * Merges a base DSL with partial overrides (used for variants).
 * Override sections replace base sections that share the same sectionTypeKey;
 * base sections not present in overrides are kept as-is.
 */
export function mergeDslWithOverrides(
  base: ResumeDslV2,
  overrides: Partial<ResumeDslV2>,
): ResumeDslV2 {
  const mergedSections = overrides.sections
    ? mergeSections(base.sections, overrides.sections)
    : base.sections;

  return {
    version: overrides.version ?? base.version,
    sections: mergedSections,
    headerOverrides: overrides.headerOverrides
      ? { ...base.headerOverrides, ...overrides.headerOverrides }
      : base.headerOverrides,
  };
}

function mergeSections(
  baseSections: SectionEntry[],
  overrideSections: SectionEntry[],
): SectionEntry[] {
  const overrideMap = new Map(overrideSections.map((s) => [s.sectionTypeKey, s]));
  const baseKeys = new Set(baseSections.map((s) => s.sectionTypeKey));

  const merged = baseSections.map((base) => overrideMap.get(base.sectionTypeKey) ?? base);

  for (const override of overrideSections) {
    if (!baseKeys.has(override.sectionTypeKey)) {
      merged.push(override);
    }
  }

  return merged;
}
