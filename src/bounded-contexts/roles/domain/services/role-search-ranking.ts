/**
 * Role-title search ranking — single source of truth for how the
 * Add Experience role autocomplete orders matches.
 *
 * The query is folded and split into whitespace tokens and EVERY token
 * must match the label (AND semantics). Each token contributes its
 * strongest tier; a whole-query exact match and the preferred-label
 * boost are row-level additions. Rows order by total score descending,
 * then by label length (shorter = more canonical), then label.
 *
 * `scoreRoleTitle` is the executable reference implementation: the
 * in-memory test double runs it directly and the Prisma adapter mirrors
 * it in SQL (`prisma-role-search.adapter.ts`). Keep the two in lockstep
 * when changing tiers.
 */

export const ROLE_SEARCH_TIERS = {
  /** Whole normalized query IS the label — unambiguous intent, always wins. */
  EXACT_LABEL: 100,
  /** Label starts with the token — how people type titles. */
  LABEL_PREFIX: 60,
  /** Token starts a later word ("eng" → "software engineer"). */
  WORD_PREFIX: 40,
  /** Token anywhere in the label — rescue tier. */
  CONTAINS: 20,
  /** Preferred/official title outranks a synonym at equal relevance. */
  PREFERRED_BOOST: 5,
} as const;

export interface SearchableRoleTitle {
  /** Pre-folded label (see {@link foldRoleText}) — the DB column. */
  normalizedLabel: string;
  isPreferred: boolean;
}

/**
 * Folds free text the same way the import script computes
 * `normalizedLabel`: lower-cased, diacritics stripped, whitespace
 * collapsed. JS mirror of the stored column — queries fold their input
 * with this so no per-row unaccent runs at query time.
 */
export function foldRoleText(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

/** Folded whitespace tokenization; the use case guards overall min length. */
export function tokenizeRoleQuery(query: string): string[] {
  return foldRoleText(query)
    .split(' ')
    .filter((token) => token.length > 0);
}

/** Strongest tier the token hits; the if-chain is in descending tier order. */
function scoreToken(normalizedLabel: string, token: string): number {
  if (normalizedLabel.startsWith(token)) return ROLE_SEARCH_TIERS.LABEL_PREFIX;
  if (normalizedLabel.includes(` ${token}`)) return ROLE_SEARCH_TIERS.WORD_PREFIX;
  if (normalizedLabel.includes(token)) return ROLE_SEARCH_TIERS.CONTAINS;
  return 0;
}

/**
 * Total relevance of a row for the tokenized query, or `null` when some
 * token matches nothing (AND semantics — the row is excluded). `tokens`
 * and `wholeQuery` must already be folded (see {@link tokenizeRoleQuery}
 * / {@link foldRoleText}).
 */
export function scoreRoleTitle(
  row: SearchableRoleTitle,
  tokens: string[],
  wholeQuery: string,
): number | null {
  let total = 0;
  for (const token of tokens) {
    const score = scoreToken(row.normalizedLabel, token);
    if (score === 0) return null;
    total += score;
  }
  if (row.normalizedLabel === wholeQuery) total += ROLE_SEARCH_TIERS.EXACT_LABEL;
  if (row.isPreferred) total += ROLE_SEARCH_TIERS.PREFERRED_BOOST;
  return total;
}
