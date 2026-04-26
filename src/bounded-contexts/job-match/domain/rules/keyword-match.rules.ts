import type { SubScoreResult } from '../types';

/**
 * Curated synonym map — tech aliases that appear constantly in job
 * descriptions but not always the exact string in the resume. Keep it
 * small and tech-agnostic; domain-specific synonyms (DevOps, data,
 * security) get layered in by a follow-up that loads from a catalog
 * table. Also note: this map is case-insensitive because we lowercase
 * both sides before lookup.
 */
const SYNONYM_MAP: ReadonlyMap<string, string> = new Map([
  ['js', 'javascript'],
  ['ts', 'typescript'],
  ['k8s', 'kubernetes'],
  ['ci/cd', 'ci'],
  ['gcp', 'google cloud'],
  ['postgresql', 'postgresdb'],
  ['postgres', 'postgresdb'],
  ['aws', 'amazon web services'],
  ['nodejs', 'node'],
  ['node.js', 'node'],
  ['reactjs', 'react'],
  ['react.js', 'react'],
]);

export interface KeywordMatchInput {
  /** The job description keywords (stack, tools, certifications). */
  readonly required: readonly string[];
  /** Keywords extracted from the resume (skills + inline mentions). */
  readonly candidate: readonly string[];
}

export interface KeywordMatchResult extends SubScoreResult {
  readonly score: number;
  readonly detail: Readonly<{ matched: readonly string[]; missing: readonly string[] }>;
}

/**
 * Deterministic keyword scorer:
 * - lowercases both sides
 * - normalises via the synonym map
 * - reports exact matches and misses
 * - score = 100 × (matched / required) when any required keywords exist;
 *   100 when the job has no required keywords at all (a job without a
 *   stack list can't fail a candidate on keywords).
 *
 * Stemming and fuzzy-match (Levenshtein ≤ 2) are TODO — they land when
 * we have ground-truth data to tune false-positive thresholds. Until
 * then, false-negatives are the lesser evil versus a bad matcher
 * promoting weak candidates.
 */
export function scoreKeywordMatch(input: KeywordMatchInput): KeywordMatchResult {
  const normalisedCandidate = new Set(input.candidate.map(normalise));
  const requiredNormalised = input.required.map(normalise);

  if (requiredNormalised.length === 0) {
    return {
      score: 100,
      detail: { matched: [], missing: [] },
    };
  }

  const matched: string[] = [];
  const missing: string[] = [];
  const seenRequired = new Set<string>();
  for (let i = 0; i < requiredNormalised.length; i++) {
    const normRequired = requiredNormalised[i];
    const rawRequired = input.required[i];
    if (!normRequired || !rawRequired) continue;
    if (seenRequired.has(normRequired)) continue; // dedupe required side
    seenRequired.add(normRequired);
    if (normalisedCandidate.has(normRequired)) matched.push(rawRequired);
    else missing.push(rawRequired);
  }

  const totalUnique = seenRequired.size;
  const score = totalUnique === 0 ? 100 : Math.round((matched.length / totalUnique) * 100);
  return { score, detail: { matched, missing } };
}

function normalise(raw: string): string {
  const lowered = raw.trim().toLowerCase();
  return SYNONYM_MAP.get(lowered) ?? lowered;
}
