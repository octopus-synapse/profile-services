import { z } from 'zod';

/**
 * Score Rank (S/A/B/C/D/F) — Shared Kernel
 *
 * Single source of truth for how a 0-100 score maps to a letter grade.
 * Every score in the product (Resume Quality, Match, Style, Readiness)
 * grades through here so the ladder stays identical across bounded
 * contexts and — via the mirrored `scoreGrade()` in the frontend
 * `@patch-careers/ui` `score-scale.ts` — across the app UI.
 *
 * Thresholds (operate on the RAW score so fractional boundaries bucket
 * predictably, e.g. 89.9 is still an A):
 *   S >= 90 · A >= 80 · B >= 70 · C >= 60 · D >= 50 · F < 50
 *
 * These are the canonical thresholds. `docs/scoring/README.md` previously
 * documented a divergent D 40-59 / F 0-39 split; the code values here win.
 */

export const ScoreRankSchema = z.enum(['S', 'A', 'B', 'C', 'D', 'F']);
export type ScoreRank = z.infer<typeof ScoreRankSchema>;

/** Ranks ordered worst → best, so `indexOf` yields a comparable magnitude. */
export const RANK_ORDER: ReadonlyArray<ScoreRank> = ['F', 'D', 'C', 'B', 'A', 'S'];

/** Maps a 0-100 score to its letter grade. */
export function scoreToRank(score: number): ScoreRank {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

/**
 * Compares two ranks by ladder position.
 * Returns > 0 when `a` is better than `b`, < 0 when worse, 0 when equal.
 */
export function compareRank(a: ScoreRank, b: ScoreRank): number {
  return RANK_ORDER.indexOf(a) - RANK_ORDER.indexOf(b);
}
