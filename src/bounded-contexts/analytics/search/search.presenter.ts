/**
 * Parse a comma-separated query-string value into trimmed tokens.
 * Kept outside the controller so the HTTP layer doesn't need to iterate.
 */
export function parseCsvQuery(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    if (trimmed) out.push(trimmed);
  }
  return out.length > 0 ? out : undefined;
}
