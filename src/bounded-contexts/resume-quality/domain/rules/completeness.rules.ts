import type { SectionAtsCatalog } from '../ports/section-ats-catalog.port';
import { COMPLETENESS_WEIGHTS, type QualityIssue } from '../types';

/** A single piece of gradeable free-text pulled from a resume section,
 * fed to the Content Quality AI. `sectionKind` is the originating
 * `semanticKind` (WORK_EXPERIENCE / SUMMARY / PROJECT / …). */
export interface ResumeBullet {
  readonly id: string;
  readonly text: string;
  readonly sectionKind: string;
}

/** Minimal resume shape the rules care about — intentionally not the
 * Prisma model so the rule layer stays decoupled from persistence and
 * trivial to unit-test with literals. */
export interface ResumeForCompleteness {
  readonly fullName: string | null;
  readonly summary: string | null;
  readonly jobTitle: string | null;
  /** Optional: when loaded, a blank phone fails the phone rule.
   * `undefined` (not loaded) skips the check so unit literals stay terse. */
  readonly phone?: string | null;
  /** Resume language (`pt-br` / `en`); forwarded to the Content Quality
   * AI so issue text comes back in the user's language. */
  readonly language?: string | null;
  readonly experiences: ReadonlyArray<{
    readonly startedAt?: Date | null;
    readonly endedAt?: Date | null;
    readonly company?: string | null;
    readonly role?: string | null;
  }>;
  readonly educations: ReadonlyArray<{
    readonly institution?: string | null;
    readonly startedAt?: Date | null;
    readonly endedAt?: Date | null;
  }>;
  readonly skills: ReadonlyArray<{ readonly name: string }>;
  /** Real free-text bullets (experience descriptions, achievements,
   * summary, project highlights) for the Content Quality AI. Optional so
   * the completeness unit literals stay terse. */
  readonly bullets?: ReadonlyArray<ResumeBullet>;
  /** Optional resume sections, used by the structural ATS checks
   * (mandatory section + weighted fields) when a catalog is provided. */
  readonly sections?: ReadonlyArray<{
    readonly semanticKind: string;
    readonly items: ReadonlyArray<{ readonly content: Record<string, unknown> }>;
  }>;
}

export interface CompletenessResult {
  readonly score: number;
  readonly issues: readonly QualityIssue[];
}

const MIN_SUMMARY_CHARS = 80;

/**
 * Deterministic completeness scorer. Applies each rule independently;
 * a rule either adds its weight to the accumulator (pass) or emits an
 * issue and contributes nothing (fail). The function is pure — same
 * input, same output — so snapshot tests can exercise the boundaries.
 */
export function scoreCompleteness(
  resume: ResumeForCompleteness,
  catalog?: SectionAtsCatalog,
): CompletenessResult {
  let score = 0;
  const issues: QualityIssue[] = [];

  // ── Presence rules ───────────────────────────────────────────────
  if (nonBlank(resume.fullName)) {
    score += COMPLETENESS_WEIGHTS.fullName;
  } else {
    issues.push({ code: 'CODE_MISSING_FULL_NAME', severity: 'high' });
  }

  // Phone — scores when loaded. Skipped entirely when the field wasn't
  // loaded (`undefined`) so unit literals without a phone stay terse.
  if (resume.phone !== undefined) {
    if (nonBlank(resume.phone)) {
      score += COMPLETENESS_WEIGHTS.phone;
    } else {
      issues.push({ code: 'CODE_MISSING_PHONE', severity: 'medium' });
    }
  }

  // Email is sourced from `User.email` (set at signup), no longer
  // stored per-resume. Award the email weight unconditionally so the
  // composite completeness score matches what the rule used to do
  // when every resume had an `emailContact` populated from signup.
  score += COMPLETENESS_WEIGHTS.email;

  if (nonBlank(resume.jobTitle)) {
    score += COMPLETENESS_WEIGHTS.jobTitle;
  } else {
    issues.push({ code: 'CODE_MISSING_JOB_TITLE', severity: 'medium' });
  }

  const summary = resume.summary?.trim() ?? '';
  if (summary.length >= MIN_SUMMARY_CHARS) {
    score += COMPLETENESS_WEIGHTS.summary;
  } else if (summary.length > 0) {
    score += Math.round((summary.length / MIN_SUMMARY_CHARS) * COMPLETENESS_WEIGHTS.summary);
    issues.push({
      code: 'CODE_SUMMARY_TOO_SHORT',
      severity: 'medium',
      messageArgs: { currentLength: summary.length, minimumLength: MIN_SUMMARY_CHARS },
    });
  } else {
    issues.push({ code: 'CODE_MISSING_SUMMARY', severity: 'high' });
  }

  if (resume.experiences.length > 0) {
    score += COMPLETENESS_WEIGHTS.experience;
  } else {
    issues.push({ code: 'CODE_MISSING_EXPERIENCE', severity: 'high' });
  }

  if (resume.educations.length > 0) {
    score += COMPLETENESS_WEIGHTS.education;
  } else {
    issues.push({ code: 'CODE_MISSING_EDUCATION', severity: 'medium' });
  }

  if (resume.skills.length > 0) {
    score += COMPLETENESS_WEIGHTS.skills;
  } else {
    issues.push({ code: 'CODE_MISSING_SKILLS', severity: 'high' });
  }

  // Dates — every experience/education entry should carry a start date
  // ("data de início no cargo atual"). End date is optional (an ongoing
  // role legitimately has none), so only the start is required. Awards
  // the weight when there is at least one dated entry and all of them
  // have a start; otherwise emits the count of entries missing it.
  const datedEntries = [...resume.experiences, ...resume.educations];
  const missingStart = datedEntries.filter((e) => e.startedAt == null).length;
  if (datedEntries.length > 0 && missingStart === 0) {
    score += COMPLETENESS_WEIGHTS.dates;
  } else if (missingStart > 0) {
    issues.push({
      code: 'CODE_MISSING_DATES',
      severity: 'medium',
      messageArgs: { count: missingStart },
    });
  }

  // ── Quality-of-content rules (still deterministic) ───────────────
  if (!hasTemporalOverlap(resume.experiences)) {
    score += COMPLETENESS_WEIGHTS.temporalConsistency;
  } else {
    issues.push({ code: 'CODE_TEMPORAL_OVERLAP', severity: 'low' });
  }

  const duplicates = findDuplicateSkills(resume.skills);
  if (duplicates.length === 0) {
    score += COMPLETENESS_WEIGHTS.uniqueSkills;
  } else {
    for (const name of duplicates) {
      issues.push({
        code: 'CODE_DUPLICATE_SKILL',
        severity: 'low',
        messageArgs: { skill: name },
      });
    }
  }

  // ── Structural ATS checks (advisory; ported from the retired ATS
  // score). Only run when both a catalog and loaded sections exist. ──
  if (catalog && resume.sections) {
    appendStructuralIssues(resume.sections, catalog, issues);
  }

  return { score: Math.max(0, Math.min(100, score)), issues };
}

/** Emits the mandatory-section and weighted-field issues. Pure; mutates
 * the passed `issues` array for symmetry with the rules above. */
function appendStructuralIssues(
  sections: NonNullable<ResumeForCompleteness['sections']>,
  catalog: SectionAtsCatalog,
  issues: QualityIssue[],
): void {
  const presentKinds = new Set(sections.map((s) => s.semanticKind));

  // Mandatory section missing entirely.
  for (const rule of catalog) {
    if (rule.isMandatory && !presentKinds.has(rule.semanticKind)) {
      issues.push({
        code: 'CODE_MISSING_MANDATORY_SECTION',
        severity: 'high',
        messageArgs: { sectionKind: rule.semanticKind },
        context: { sectionKey: rule.semanticKind },
      });
    }
  }

  // Weighted fields absent within an item of a present section.
  const ruleByKind = new Map(catalog.map((r) => [r.semanticKind, r]));
  for (const section of sections) {
    const rule = ruleByKind.get(section.semanticKind);
    if (!rule) continue;
    const weightedKeys = Object.keys(rule.fieldWeights)
      .map((role) => rule.roleToFieldKey[role])
      .filter((key): key is string => typeof key === 'string');
    if (weightedKeys.length === 0) continue;

    section.items.forEach((item, itemIndex) => {
      const missing = weightedKeys.filter((key) => !nonBlankUnknown(item.content[key]));
      if (missing.length > 0) {
        issues.push({
          code: 'CODE_MISSING_WEIGHTED_FIELDS',
          severity: missing.length > 2 ? 'high' : 'medium',
          messageArgs: { sectionKind: section.semanticKind, missingFields: missing.join(', ') },
          context: { sectionKey: section.semanticKind, itemIndex },
        });
      }
    });
  }
}

function nonBlankUnknown(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : value != null;
}

function nonBlank(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasTemporalOverlap(experiences: ResumeForCompleteness['experiences']): boolean {
  const periods = experiences
    .map((e) => ({
      from: e.startedAt?.getTime() ?? null,
      to: e.endedAt?.getTime() ?? Number.POSITIVE_INFINITY,
    }))
    .filter((p): p is { from: number; to: number } => p.from !== null)
    .sort((a, b) => a.from - b.from);

  for (let i = 1; i < periods.length; i++) {
    const prev = periods[i - 1];
    const curr = periods[i];
    if (prev && curr && curr.from < prev.to) return true;
  }
  return false;
}

function findDuplicateSkills(skills: ResumeForCompleteness['skills']): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const s of skills) {
    const key = s.name.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) dupes.add(s.name);
    else seen.add(key);
  }
  return [...dupes];
}
