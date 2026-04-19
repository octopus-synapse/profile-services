export type BundleFormat = 'pdf' | 'docx' | 'json';

const ALLOWED: ReadonlySet<string> = new Set(['pdf', 'docx', 'json']);

/**
 * Parses a comma-separated query string into a deduplicated, validated
 * BundleFormat array. Returns undefined when the caller didn't supply
 * anything or the input contains nothing usable, signalling "use defaults".
 */
export function parseBundleFormats(raw?: string): BundleFormat[] | undefined {
  if (!raw) return undefined;
  const out: BundleFormat[] = [];
  for (const piece of raw.split(',')) {
    const value = piece.trim().toLowerCase();
    if (ALLOWED.has(value) && !out.includes(value as BundleFormat)) {
      out.push(value as BundleFormat);
    }
  }
  return out.length > 0 ? out : undefined;
}
