/**
 * Pure scoring helpers for fit calculation. Live in services/ but contain
 * no I/O — keep them framework-free so they're trivially testable.
 */

/** 0–100 coverage of `needles` that appear (case-insensitively) in `haystack`. */
export function percentOverlap(needles: string[], haystack: string[]): number {
  if (needles.length === 0) return 0;
  const hs = new Set(haystack.map((h) => h.toLowerCase()));
  const hit = needles.filter((n) => hs.has(n.toLowerCase())).length;
  return Math.round((hit / needles.length) * 100);
}

/**
 * Coarse soft-skill signal extractor. Scans free-form text for the usual
 * suspects so we have *something* to feed into the soft-skills dimension
 * until the skills catalog exposes a canonical list.
 */
export function extractSoftSignals(text: string | null | undefined): string[] {
  if (!text) return [];
  const vocab = [
    'communication',
    'collaboration',
    'leadership',
    'ownership',
    'mentorship',
    'problem-solving',
    'autonomy',
    'teamwork',
    'english',
    'portuguese',
    'stakeholder',
    'presentation',
  ];
  const lower = text.toLowerCase();
  return vocab.filter((v) => lower.includes(v));
}
