/**
 * Single source of truth for the well-known section *semantic kinds*.
 *
 * The section model is data-driven — arbitrary kinds can be added in the
 * DB without code changes (`SemanticKind` stays `string`). But a handful
 * of kinds are referenced by name in production logic (the resume-quality
 * projection + the AI-content debounce), and scattering those as bare
 * string literals (`'WORK_EXPERIENCE'`) is a magic-string smell — and is
 * caught by the `generic-sections-guardrail` arch test.
 *
 * This module names them once. Production code references the symbols
 * (`SEMANTIC_KIND.WORK_EXPERIENCE`), so there are no literals to leak; the
 * literals live in exactly this one allowlisted definition file. The
 * `semantic-kind.drift.spec.ts` test asserts these values stay in sync
 * with the seeded `SectionType.semanticKind` catalog.
 */

import type { SemanticKind } from './generic-section.types';

export const SEMANTIC_KIND = {
  WORK_EXPERIENCE: 'WORK_EXPERIENCE',
  EDUCATION: 'EDUCATION',
  SKILL_SET: 'SKILL_SET',
  SUMMARY: 'SUMMARY',
  PROJECT: 'PROJECT',
  VOLUNTEER: 'VOLUNTEER',
  AWARD: 'AWARD',
  INTEREST: 'INTEREST',
  RECOMMENDATION: 'RECOMMENDATION',
  PUBLICATION: 'PUBLICATION',
  TALK: 'TALK',
  HACKATHON: 'HACKATHON',
  BUG_BOUNTY: 'BUG_BOUNTY',
  OPEN_SOURCE: 'OPEN_SOURCE',
  ACHIEVEMENT: 'ACHIEVEMENT',
} as const satisfies Record<string, SemanticKind>;

export type WellKnownSemanticKind = (typeof SEMANTIC_KIND)[keyof typeof SEMANTIC_KIND];
