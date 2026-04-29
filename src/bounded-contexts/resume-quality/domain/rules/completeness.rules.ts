import { COMPLETENESS_WEIGHTS, type QualityIssue } from '../types';

/** Minimal resume shape the rules care about — intentionally not the
 * Prisma model so the rule layer stays decoupled from persistence and
 * trivial to unit-test with literals. */
export interface ResumeForCompleteness {
  readonly fullName: string | null;
  readonly summary: string | null;
  readonly jobTitle: string | null;
  readonly experiences: ReadonlyArray<{
    readonly startedAt?: Date | null;
    readonly endedAt?: Date | null;
    readonly company?: string | null;
    readonly role?: string | null;
  }>;
  readonly educations: ReadonlyArray<{ readonly institution?: string | null }>;
  readonly skills: ReadonlyArray<{ readonly name: string }>;
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
export function scoreCompleteness(resume: ResumeForCompleteness): CompletenessResult {
  let score = 0;
  const issues: QualityIssue[] = [];

  // ── Presence rules ───────────────────────────────────────────────
  if (nonBlank(resume.fullName)) {
    score += COMPLETENESS_WEIGHTS.fullName;
  } else {
    issues.push({ code: 'CODE_MISSING_FULL_NAME', severity: 'high' });
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

  return { score: Math.max(0, Math.min(100, score)), issues };
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
