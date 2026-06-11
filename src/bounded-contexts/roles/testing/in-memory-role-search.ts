import { type RoleSearchParams, RoleSearchPort } from '../domain/ports/role-search.port';
import { foldRoleText, scoreRoleTitle } from '../domain/services/role-search-ranking';
import type { RoleTitleItem } from '../roles.routes.schemas';

/** Fake `RoleSearchPort`: seeded titles ranked by the real JS scorer
 *  (the reference implementation the Prisma adapter mirrors in SQL),
 *  so use-case specs exercise the production ordering. */
export class InMemoryRoleSearch extends RoleSearchPort {
  readonly titles: RoleTitleItem[] = [];
  readonly calls: RoleSearchParams[] = [];

  seed(...titles: RoleTitleItem[]): void {
    this.titles.push(...titles);
  }

  async searchTitles(params: RoleSearchParams): Promise<RoleTitleItem[]> {
    this.calls.push(params);
    return this.titles
      .filter((title) => title.lang === params.lang)
      .map((title) => ({
        title,
        score: scoreRoleTitle(
          { normalizedLabel: foldRoleText(title.label), isPreferred: title.isPreferred },
          params.tokens,
          params.wholeQuery,
        ),
      }))
      .filter((entry): entry is { title: RoleTitleItem; score: number } => entry.score !== null)
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.title.label.length - b.title.label.length ||
          a.title.label.localeCompare(b.title.label),
      )
      .slice(0, params.limit)
      .map((entry) => entry.title);
  }
}
