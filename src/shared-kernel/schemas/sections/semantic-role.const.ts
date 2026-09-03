/**
 * Single source of truth for the *semantic roles* a section field can carry.
 *
 * Sibling of `semantic-kind.const.ts`, and it exists for the same reason: the
 * section model is data-driven (`SemanticRole` stays `string`, so the DB can
 * grow new roles without a deploy), but a few call sites — today the bilingual
 * field-translation policy — must name roles to make a decision about them.
 * Scattering `'DESCRIPTION'` / `'ACHIEVEMENT'` as bare literals is the magic
 * string smell the `generic-sections-guardrail` arch test catches.
 *
 * This module names them once; production code references the symbols.
 * `test/static-analysis/i18n/translation-field-policy-parity.spec.ts` asserts
 * these stay in sync with the roles actually declared in
 * `prisma/seeds/shared/section-type.seed.ts`.
 */

import type { SemanticRole } from './semantic-sections.schema';

export const SEMANTIC_ROLE = {
  // Identity / naming
  TITLE: 'TITLE',
  PERSON_NAME: 'PERSON_NAME',
  PROJECT_NAME: 'PROJECT_NAME',
  EVENT_NAME: 'EVENT_NAME',
  INTEREST_NAME: 'INTEREST_NAME',
  LANGUAGE_NAME: 'LANGUAGE_NAME',
  SKILL_NAME: 'SKILL_NAME',
  ORGANIZATION: 'ORGANIZATION',
  ORGANIZATION_DOMAIN: 'ORGANIZATION_DOMAIN',

  // Prose
  DESCRIPTION: 'DESCRIPTION',
  SUMMARY_TEXT: 'SUMMARY_TEXT',
  HIGHLIGHTS: 'HIGHLIGHTS',
  ACHIEVEMENT: 'ACHIEVEMENT',

  // Role / seniority
  JOB_TITLE: 'JOB_TITLE',
  SENIORITY_LEVEL: 'SENIORITY_LEVEL',
  EMPLOYMENT_TYPE: 'EMPLOYMENT_TYPE',
  CONTRIBUTION_TYPE: 'CONTRIBUTION_TYPE',

  // Education
  FIELD_OF_STUDY: 'FIELD_OF_STUDY',
  DEGREE: 'DEGREE',
  DEGREE_TYPE: 'DEGREE_TYPE',

  // Classification / closed vocabularies
  CATEGORY: 'CATEGORY',
  PROFICIENCY: 'PROFICIENCY',
  STATUS: 'STATUS',
  SEVERITY: 'SEVERITY',
  LINK_KIND: 'LINK_KIND',
  KEYWORDS: 'KEYWORDS',
  TECHNOLOGIES: 'TECHNOLOGIES',

  // Dates
  START_DATE: 'START_DATE',
  END_DATE: 'END_DATE',
  ISSUE_DATE: 'ISSUE_DATE',
  EXPIRY_DATE: 'EXPIRY_DATE',
  EVENT_DATE: 'EVENT_DATE',
  DISCOVERY_DATE: 'DISCOVERY_DATE',
  ACHIEVEMENT_DATE: 'ACHIEVEMENT_DATE',

  // Contact / locators
  URL: 'URL',
  REPOSITORY_URL: 'REPOSITORY_URL',
  PROOF_URL: 'PROOF_URL',
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  LOCATION: 'LOCATION',

  // Misc
  REWARD: 'REWARD',
} as const satisfies Record<string, SemanticRole>;

export type WellKnownSemanticRole = (typeof SEMANTIC_ROLE)[keyof typeof SEMANTIC_ROLE];
