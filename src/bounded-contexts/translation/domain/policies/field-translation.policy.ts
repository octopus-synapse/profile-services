/**
 * Which resume section fields may be machine-translated (ADR-003 §5).
 *
 * The policy key is the **pair** `(sectionTypeKey, semanticRole)`, not the role
 * alone, because the same role flips meaning between sections:
 *
 *  - `SKILL_NAME` is "React" in `skill_set_v1` (a product name — never
 *    translate) and "Liderança" in `soft_skill_set_v1` (prose — translate).
 *  - `TITLE` is prose in `award_v1` ("Employee of the Year") and a credential
 *    name in `certification_v1` ("AWS Certified Solutions Architect", which
 *    translated becomes a credential that does not exist).
 *
 * The failure mode that matters is **not** a mediocre translation; it is a
 * field that looks translatable and is not — a mangled company name, a dead
 * credential, a broken citation. So the table is an allowlist: every pair is
 * written down with its reason, and anything absent is not translated.
 *
 * Exhaustiveness is enforced outside the type system, by
 * `test/static-analysis/i18n/translation-field-policy-parity.spec.ts`, which
 * cross-checks this table against `prisma/seeds/shared/section-type.seed.ts`.
 * A new section type — or a new field on an existing one — fails that spec
 * until someone records a decision here. It must never default silently.
 */

import { SEMANTIC_ROLE } from '@/shared-kernel/schemas/sections/semantic-role.const';
import type { SemanticRole } from '@/shared-kernel/schemas/sections/semantic-sections.schema';

/** A recorded decision for one `(sectionTypeKey, semanticRole)` pair. */
export interface FieldTranslationDecision {
  readonly translatable: boolean;
  /** Why. Read by humans reviewing the table, and surfaced in policy dumps. */
  readonly reason: string;
}

type SectionPolicy = Readonly<Record<string, FieldTranslationDecision>>;

const NO = (reason: string): FieldTranslationDecision => ({ translatable: false, reason });
const YES = (reason: string): FieldTranslationDecision => ({ translatable: true, reason });

/** Reasons reused across many sections, so the table reads as a decision and
 *  not as forty independent judgement calls. */
const PROSE = 'Author-written prose; the whole point of a bilingual resume.';
const PROPER_NOUN = 'Proper noun. Translating invents an entity that does not exist.';
const CLOSED_ENUM = 'Closed vocabulary, already localized by @packages/i18n.';
const DATE = 'ISO date. Locale formatting is a render concern, not a translation.';
const LOCATOR = 'URL / email / phone. The translate prompt already skips these.';
const TECH_NAME = 'Technology or product name; identical in both locales.';

export const FIELD_TRANSLATION_POLICY: Readonly<Record<string, SectionPolicy>> = {
  skill_set_v1: {
    [SEMANTIC_ROLE.SKILL_NAME]: NO(`Hard skill. ${TECH_NAME}`),
    [SEMANTIC_ROLE.CATEGORY]: NO(CLOSED_ENUM),
  },

  language_v1: {
    // Endonyms are how the reader recognises the entry, and the level next to
    // it is already localized. Flagged in the ADR rollout notes as the one
    // "not translated" call worth revisiting with real resumes in hand.
    [SEMANTIC_ROLE.LANGUAGE_NAME]: NO(PROPER_NOUN),
    [SEMANTIC_ROLE.PROFICIENCY]: NO(CLOSED_ENUM),
  },

  work_experience_v1: {
    [SEMANTIC_ROLE.ORGANIZATION]: NO(PROPER_NOUN),
    [SEMANTIC_ROLE.ORGANIZATION_DOMAIN]: NO(LOCATOR),
    [SEMANTIC_ROLE.JOB_TITLE]: YES('ADR-003 §6: the role is translated.'),
    [SEMANTIC_ROLE.SENIORITY_LEVEL]: NO(CLOSED_ENUM),
    [SEMANTIC_ROLE.EMPLOYMENT_TYPE]: NO(CLOSED_ENUM),
    [SEMANTIC_ROLE.START_DATE]: NO(DATE),
    [SEMANTIC_ROLE.END_DATE]: NO(DATE),
    [SEMANTIC_ROLE.DESCRIPTION]: YES(PROSE),
    [SEMANTIC_ROLE.HIGHLIGHTS]: YES(PROSE),
  },

  award_v1: {
    // The `TITLE` fork: an award name is a phrase the issuer wrote, and it
    // reads as prose in the target locale.
    [SEMANTIC_ROLE.TITLE]: YES('Award name is prose ("Employee of the Year").'),
    [SEMANTIC_ROLE.ORGANIZATION]: NO(PROPER_NOUN),
    [SEMANTIC_ROLE.ISSUE_DATE]: NO(DATE),
    [SEMANTIC_ROLE.DESCRIPTION]: YES(PROSE),
    [SEMANTIC_ROLE.PROOF_URL]: NO(LOCATOR),
  },

  education_v1: {
    [SEMANTIC_ROLE.ORGANIZATION]: NO(PROPER_NOUN),
    // Degree and field are the registrar's wording for a credential that was
    // actually issued; the same conservatism as `certification_v1.TITLE`.
    [SEMANTIC_ROLE.FIELD_OF_STUDY]: NO('Part of an issued credential; see DEGREE.'),
    [SEMANTIC_ROLE.DEGREE]: NO('Names a credential that was issued in that wording.'),
    [SEMANTIC_ROLE.DEGREE_TYPE]: NO(CLOSED_ENUM),
    [SEMANTIC_ROLE.START_DATE]: NO(DATE),
    [SEMANTIC_ROLE.END_DATE]: NO(DATE),
    [SEMANTIC_ROLE.STATUS]: NO(CLOSED_ENUM),
    [SEMANTIC_ROLE.DESCRIPTION]: YES(PROSE),
  },

  certification_v1: {
    // The other side of the `TITLE` fork.
    [SEMANTIC_ROLE.TITLE]: NO('Credential name. Translated it names nothing.'),
    [SEMANTIC_ROLE.ORGANIZATION]: NO(PROPER_NOUN),
    [SEMANTIC_ROLE.ISSUE_DATE]: NO(DATE),
    [SEMANTIC_ROLE.EXPIRY_DATE]: NO(DATE),
    [SEMANTIC_ROLE.CREDENTIAL_ID]: NO('Issuer-assigned identifier; translating breaks it.'),
    [SEMANTIC_ROLE.URL]: NO(LOCATOR),
  },

  // Deactivated in the catalog (`isActive: false`) but still carried by
  // existing rows, so it keeps a decision.
  summary_v1: {
    [SEMANTIC_ROLE.SUMMARY_TEXT]: YES(PROSE),
  },

  project_v1: {
    [SEMANTIC_ROLE.TITLE]: NO(`Project name. ${PROPER_NOUN}`),
    [SEMANTIC_ROLE.DESCRIPTION]: YES(PROSE),
    [SEMANTIC_ROLE.URL]: NO(LOCATOR),
    [SEMANTIC_ROLE.REPOSITORY_URL]: NO(LOCATOR),
    [SEMANTIC_ROLE.START_DATE]: NO(DATE),
    [SEMANTIC_ROLE.END_DATE]: NO(DATE),
    [SEMANTIC_ROLE.TECHNOLOGIES]: NO(TECH_NAME),
    [SEMANTIC_ROLE.HIGHLIGHTS]: YES(PROSE),
  },

  publication_v1: {
    [SEMANTIC_ROLE.TITLE]: NO('Citable title; translating breaks the citation.'),
    [SEMANTIC_ROLE.ORGANIZATION]: NO(PROPER_NOUN),
    [SEMANTIC_ROLE.ISSUE_DATE]: NO(DATE),
    [SEMANTIC_ROLE.URL]: NO(LOCATOR),
    [SEMANTIC_ROLE.DESCRIPTION]: YES(PROSE),
  },

  interest_v1: {
    // Short free-text tags. High false-positive risk for low payoff; the ADR
    // counts nine prose-bearing field keys and this is not one of them.
    [SEMANTIC_ROLE.INTEREST_NAME]: NO('Short tag, not prose. See ADR-003 §5.'),
    [SEMANTIC_ROLE.KEYWORDS]: NO('Short tags, not prose.'),
  },

  recommendation_v1: {
    [SEMANTIC_ROLE.PERSON_NAME]: NO(PROPER_NOUN),
    [SEMANTIC_ROLE.JOB_TITLE]: YES('ADR-003 §6: the role is translated.'),
    [SEMANTIC_ROLE.ORGANIZATION]: NO(PROPER_NOUN),
    [SEMANTIC_ROLE.EMAIL]: NO(LOCATOR),
    [SEMANTIC_ROLE.PHONE]: NO(LOCATOR),
    [SEMANTIC_ROLE.DESCRIPTION]: YES(`Recommendation body. ${PROSE}`),
  },

  hackathon_v1: {
    [SEMANTIC_ROLE.TITLE]: NO(`Hackathon name. ${PROPER_NOUN}`),
    [SEMANTIC_ROLE.ORGANIZATION]: NO(PROPER_NOUN),
    [SEMANTIC_ROLE.EVENT_DATE]: NO(DATE),
    [SEMANTIC_ROLE.PROJECT_NAME]: NO(PROPER_NOUN),
    [SEMANTIC_ROLE.ACHIEVEMENT]: YES('Placement is prose ("2nd place, 340 teams").'),
    [SEMANTIC_ROLE.DESCRIPTION]: YES(PROSE),
    [SEMANTIC_ROLE.URL]: NO(LOCATOR),
  },

  open_source_v1: {
    [SEMANTIC_ROLE.TITLE]: NO(`Project name. ${PROPER_NOUN}`),
    [SEMANTIC_ROLE.CONTRIBUTION_TYPE]: NO(CLOSED_ENUM),
    [SEMANTIC_ROLE.DESCRIPTION]: YES(PROSE),
    [SEMANTIC_ROLE.URL]: NO(LOCATOR),
    [SEMANTIC_ROLE.START_DATE]: NO(DATE),
  },

  bug_bounty_v1: {
    [SEMANTIC_ROLE.ORGANIZATION]: NO(`Platform name. ${PROPER_NOUN}`),
    [SEMANTIC_ROLE.SEVERITY]: NO(CLOSED_ENUM),
    [SEMANTIC_ROLE.DISCOVERY_DATE]: NO(DATE),
    [SEMANTIC_ROLE.DESCRIPTION]: YES(PROSE),
    [SEMANTIC_ROLE.REWARD]: NO('Monetary amount; formatting is a render concern.'),
    [SEMANTIC_ROLE.URL]: NO(LOCATOR),
  },

  talk_v1: {
    // A talk was delivered under a name, at an event, on a date. The title is
    // a record of that, closer to `publication_v1.TITLE` than to an award.
    [SEMANTIC_ROLE.TITLE]: NO('Names a talk actually delivered under that title.'),
    [SEMANTIC_ROLE.EVENT_NAME]: NO(PROPER_NOUN),
    [SEMANTIC_ROLE.EVENT_DATE]: NO(DATE),
    [SEMANTIC_ROLE.LOCATION]: NO(`Place name. ${PROPER_NOUN}`),
    [SEMANTIC_ROLE.DESCRIPTION]: YES(PROSE),
    [SEMANTIC_ROLE.URL]: NO(LOCATOR),
  },

  achievement_v1: {
    // Freeform, self-authored, backed by no external registry — the award
    // side of the `TITLE` fork rather than the certification side.
    [SEMANTIC_ROLE.TITLE]: YES('Self-authored achievement headline; prose.'),
    [SEMANTIC_ROLE.ACHIEVEMENT_DATE]: NO(DATE),
    [SEMANTIC_ROLE.DESCRIPTION]: YES(PROSE),
  },

  soft_skill_set_v1: {
    [SEMANTIC_ROLE.SKILL_NAME]: YES('Soft skill. Prose ("Liderança" → "Leadership").'),
  },

  links_v1: {
    [SEMANTIC_ROLE.LINK_KIND]: NO(CLOSED_ENUM),
    [SEMANTIC_ROLE.URL]: NO(LOCATOR),
    [SEMANTIC_ROLE.TITLE]: NO('Link label; usually a handle or site name.'),
    [SEMANTIC_ROLE.ORGANIZATION_DOMAIN]: NO(LOCATOR),
  },
};

/**
 * The recorded decision for a pair, or `null` when none exists.
 *
 * `null` is the signal that the catalog grew a field nobody classified. The
 * static parity spec makes that state unreachable in a released build; callers
 * still get `null` rather than a throw so one unclassified field degrades to
 * "left in the source language" instead of failing the whole resume.
 */
export function lookupFieldTranslationDecision(
  sectionTypeKey: string,
  semanticRole: SemanticRole | undefined,
): FieldTranslationDecision | null {
  if (!semanticRole) return null;
  return FIELD_TRANSLATION_POLICY[sectionTypeKey]?.[semanticRole] ?? null;
}

/** Fail-safe boolean form: an unclassified pair is not translated. */
export function isFieldTranslatable(
  sectionTypeKey: string,
  semanticRole: SemanticRole | undefined,
): boolean {
  return lookupFieldTranslationDecision(sectionTypeKey, semanticRole)?.translatable === true;
}

/** Minimal shape this policy needs from a `SectionType.definition` field. */
export interface PolicyFieldDefinition {
  readonly key: string;
  readonly semanticRole?: SemanticRole;
}

/**
 * The field keys of one section type that may be machine-translated, in
 * definition order. This is the form the translation worker consumes: it
 * projects an item's `content` down to the translatable leaves before
 * spending a token.
 */
export function selectTranslatableFieldKeys(
  sectionTypeKey: string,
  fields: readonly PolicyFieldDefinition[],
): string[] {
  return fields
    .filter((field) => isFieldTranslatable(sectionTypeKey, field.semanticRole))
    .map((field) => field.key);
}

/** Section type keys carrying a recorded decision. Used by the parity spec. */
export function policySectionTypeKeys(): string[] {
  return Object.keys(FIELD_TRANSLATION_POLICY);
}
