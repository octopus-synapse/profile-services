import type { RoleTitleItem } from '../../roles.routes.schemas';

/** Parameters for one ranked lookup over a single language's titles.
 *  `tokens` / `wholeQuery` are already folded by the use case via
 *  `tokenizeRoleQuery` / `foldRoleText` so every adapter compares
 *  against the precomputed `normalizedLabel` directly. */
export interface RoleSearchParams {
  readonly tokens: string[];
  readonly wholeQuery: string;
  readonly lang: RoleTitleItem['lang'];
  readonly limit: number;
}

/**
 * Read-only ranked lookup over the RoleTitle dictionary. The concrete
 * adapter owns the dataset access and mirrors the ranking defined in
 * `domain/services/role-search-ranking.ts`; the application layer only
 * folds/clamps inputs and shapes the response.
 */
export abstract class RoleSearchPort {
  abstract searchTitles(params: RoleSearchParams): Promise<RoleTitleItem[]>;
}
