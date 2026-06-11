import type { RoleSearchPort } from '../../domain/ports/role-search.port';
import { foldRoleText, tokenizeRoleQuery } from '../../domain/services/role-search-ranking';
import type { RolesSearchQuery, RoleTitleItem } from '../../roles.routes.schemas';

const DEFAULT_LIMIT = 10;
const DEFAULT_LANG = 'PT';

/**
 * Search role-title suggestions for the Add Experience autocomplete.
 * Owns input folding/defaulting and the cross-language top-up: when the
 * primary language under-fills the limit, the other language's matches
 * fill the remainder (pt-BR users typing English titles still get hits).
 * Ranking lives in the {@link RoleSearchPort} adapter.
 */
export class SearchRolesUseCase {
  constructor(private readonly search: RoleSearchPort) {}

  async execute(query: RolesSearchQuery): Promise<RoleTitleItem[]> {
    const tokens = tokenizeRoleQuery(query.q);
    if (tokens.length === 0) return [];
    const wholeQuery = foldRoleText(query.q);
    const lang = query.lang ?? DEFAULT_LANG;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const primary = await this.search.searchTitles({ tokens, wholeQuery, lang, limit });
    if (primary.length >= limit) return primary;

    const fallback = await this.search.searchTitles({
      tokens,
      wholeQuery,
      lang: lang === 'PT' ? 'EN' : 'PT',
      limit: limit - primary.length,
    });
    // A title present in both dictionaries shouldn't show twice.
    const seen = new Set(primary.map((item) => foldRoleText(item.label)));
    return [...primary, ...fallback.filter((item) => !seen.has(foldRoleText(item.label)))];
  }
}
