/**
 * Institution search ranking — single source of truth for how the
 * institution picker orders matches across nome / sigla / municipio /
 * uf / organizacao.
 *
 * The query is split into whitespace tokens and EVERY token must match
 * at least one field (AND semantics) — that's what lets "fatec são
 * caetano" hit sigla with one token and nome/município with the others.
 * Each token contributes its strongest tier; rows order by total score
 * descending, then nome.
 *
 * `scoreInstitution` is the executable reference implementation: the
 * in-memory test repository runs it directly and the Prisma adapter
 * mirrors it in SQL (`prisma-mec-institution.repository.ts`). Keep the
 * two in lockstep when changing tiers.
 */

export const INSTITUTION_SEARCH_TIERS = {
  /** Token IS the acronym ("usp") — unambiguous intent, always wins. */
  SIGLA_EXACT: 100,
  /** Nome starts with the token — how people type names. */
  NOME_PREFIX: 80,
  /** Nome contains the token — the workhorse match. */
  NOME_CONTAINS: 60,
  /** Partial acronym ("fat" → FATECs). */
  SIGLA_CONTAINS: 40,
  /** City lookup ("santo andré"). Name matches outrank it. */
  MUNICIPIO_CONTAINS: 30,
  /** Exact 2-letter state code only — "sp" as substring would pollute. */
  UF_EXACT: 20,
  /** Academic organization ("centro universitário") — rescue tier. */
  ORGANIZACAO_CONTAINS: 10,
} as const;

export interface SearchableInstitution {
  nome: string;
  sigla: string | null;
  uf: string;
  municipio: string | null;
  organizacao: string | null;
}

/** Whitespace tokenization; the service guards overall min length. */
export function tokenizeInstitutionQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/** JS mirror of the Postgres `immutable_unaccent(lower(...))` pair. */
function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Strongest tier the token hits; the if-chain is in descending tier order. */
function scoreToken(row: SearchableInstitution, token: string): number {
  const t = fold(token);
  const nome = fold(row.nome);
  const sigla = row.sigla ? fold(row.sigla) : null;

  if (sigla === t) return INSTITUTION_SEARCH_TIERS.SIGLA_EXACT;
  if (nome.startsWith(t)) return INSTITUTION_SEARCH_TIERS.NOME_PREFIX;
  if (nome.includes(t)) return INSTITUTION_SEARCH_TIERS.NOME_CONTAINS;
  if (sigla?.includes(t)) return INSTITUTION_SEARCH_TIERS.SIGLA_CONTAINS;
  if (row.municipio && fold(row.municipio).includes(t)) {
    return INSTITUTION_SEARCH_TIERS.MUNICIPIO_CONTAINS;
  }
  if (fold(row.uf) === t) return INSTITUTION_SEARCH_TIERS.UF_EXACT;
  if (row.organizacao && fold(row.organizacao).includes(t)) {
    return INSTITUTION_SEARCH_TIERS.ORGANIZACAO_CONTAINS;
  }
  return 0;
}

/**
 * Total relevance of a row for the tokenized query, or `null` when some
 * token matches nothing (AND semantics — the row is excluded).
 */
export function scoreInstitution(row: SearchableInstitution, tokens: string[]): number | null {
  let total = 0;
  for (const token of tokens) {
    const score = scoreToken(row, token);
    if (score === 0) return null;
    total += score;
  }
  return total;
}
