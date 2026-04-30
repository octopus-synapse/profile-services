/**
 * Pure fit-score value type + function for the Recruiting BC.
 *
 * Mirrors the shape used on the candidate side (`jobs/services/compute-fit-score`)
 * intentionally — we reuse the same scoring contract so a recruiter's
 * "match" and a candidate's "fit" agree on the same number for the same
 * pair. A follow-up ADR can promote this to a shared kernel once a third
 * consumer shows up; until then, BC isolation wins over DRY.
 *
 * Score = 70 * skill_overlap + 20 * english_match + 10 * remote_match
 *   skill_overlap  = |candidate ∩ job| / max(1, |job|)  ∈ [0, 1]
 *   english_match  = 1 if meets, 0.5 if unknown on either side, 0 below.
 *   remote_match   = 1 exact, 0.6–0.7 partial, 0 mismatch, 0.5 unknown.
 *
 * Scores are clamped to the integer range [0, 100] for clean sorting /
 * threshold filtering.
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
  if (resume === 'REMOTE' && job === 'HYBRID') return 0.7;
  if (resume === 'HYBRID' && (job === 'REMOTE' || job === 'ONSITE')) return 0.6;
  return 0;
}

export function computeFitScore(input: FitScoreInput): FitScore {
  const resumeSet = new Set(normalize(input.resumeSkills));
  const jobSkills = normalize(input.jobSkills);
  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of jobSkills) {
    if (resumeSet.has(skill)) matched.push(skill);
    else missing.push(skill);
  }

  const skillOverlap = jobSkills.length === 0 ? 1 : matched.length / jobSkills.length;
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
