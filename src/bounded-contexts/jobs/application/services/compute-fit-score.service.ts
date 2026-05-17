/**
 * Pure fit-score computation.
 *
 * Score = 70 * skill_overlap + 20 * english_match + 10 * remote_match
 * where:
 *   skill_overlap  = |resume ∩ job| / max(1, |job|)  ∈ [0, 1]
 *   english_match  = 1 if resume meets job's minEnglishLevel, 0.5 if unknown,
 *                    0 if below.
 *   remote_match   = 1 if resume prefers the job's remotePolicy, 0.5 if
 *                    policy missing on either side, 0 otherwise.
 *
 * Scores are clamped to the integer range [0, 100] for clean sorting /
 * threshold filtering (e.g. the rage-apply "≥ 80" cut).
 */

export type EnglishLevel = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'FLUENT';
export type RemotePolicy = 'REMOTE' | 'HYBRID' | 'ONSITE';

export interface FitScoreInput {
  resumeSkills: string[];
  resumeEnglish?: EnglishLevel | null;
  resumeRemotePref?: RemotePolicy | null;
  jobSkills: string[];
  jobMinEnglish?: EnglishLevel | null;
  jobRemotePolicy?: RemotePolicy | null;
}

export interface FitScore {
  score: number;
  breakdown: {
    skillOverlap: number;
    englishMatch: number;
    remoteMatch: number;
    matchedSkills: string[];
    missingSkills: string[];
  };
}

const ENGLISH_ORDER: EnglishLevel[] = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'FLUENT'];

function normalize(values: string[]): string[] {
  return values
    .map((v) => v?.trim().toLowerCase())
    .filter((v): v is string => typeof v === 'string' && v.length > 0);
}

function englishAtLeast(
  resume: EnglishLevel | null | undefined,
  job: EnglishLevel | null | undefined,
): number {
  if (!job) return 1;
  if (!resume) return 0.5;
  return ENGLISH_ORDER.indexOf(resume) >= ENGLISH_ORDER.indexOf(job) ? 1 : 0;
}

function remoteMatch(
  resume: RemotePolicy | null | undefined,
  job: RemotePolicy | null | undefined,
): number {
  if (!job || !resume) return 0.5;
  if (resume === job) return 1;
  // Remote-preferring candidate accepts hybrid, not onsite.
  if (resume === 'REMOTE' && job === 'HYBRID') return 0.7;
  if (resume === 'HYBRID' && (job === 'REMOTE' || job === 'ONSITE')) return 0.6;
  return 0;
}

/**
 * P1 #37 — returns `null` when there is no skill data on either side
 * (job listing without skills, OR user's resume without skills). The
 * previous implementation treated an empty `jobSkills` array as a 100%
 * overlap, inflating false positives — every skill-less job appeared
 * as a perfect match and dominated recommendations.
 *
 * Callers that need a numeric fallback should map `null → 0.5` (neutral)
 * explicitly so the choice is visible in code review.
 */
export function computeFitScore(input: FitScoreInput): FitScore | null {
  const resumeSet = new Set(normalize(input.resumeSkills));
  const jobSkills = normalize(input.jobSkills);

  // P1 #37 — without either side's skills there's no signal worth scoring.
  if (jobSkills.length === 0 || resumeSet.size === 0) return null;

  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of jobSkills) {
    if (resumeSet.has(skill)) matched.push(skill);
    else missing.push(skill);
  }

  const skillOverlap = matched.length / jobSkills.length;
  const english = englishAtLeast(input.resumeEnglish, input.jobMinEnglish);
  const remote = remoteMatch(input.resumeRemotePref, input.jobRemotePolicy);

  const raw = 70 * skillOverlap + 20 * english + 10 * remote;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    score,
    breakdown: {
      skillOverlap: Number(skillOverlap.toFixed(3)),
      englishMatch: english,
      remoteMatch: remote,
      matchedSkills: matched,
      missingSkills: missing,
    },
  };
}
