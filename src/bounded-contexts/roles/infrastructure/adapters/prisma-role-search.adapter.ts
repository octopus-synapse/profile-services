/**
 * Postgres-backed role-title search over the dictionary populated by
 * `src/scripts/import-roles.ts`. Owns the raw SQL ranking — the mirror of
 * `scoreRoleTitle` in domain/services/role-search-ranking.ts (keep the two
 * in lockstep). All comparisons run against the precomputed
 * `normalizedLabel` column with pre-folded tokens, so no unaccent call
 * happens per row; the contains tier is backed by the trigram GIN index.
 */

import { Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { type RoleSearchParams, RoleSearchPort } from '../../domain/ports/role-search.port';
import { ROLE_SEARCH_TIERS } from '../../domain/services/role-search-ranking';
import type { RoleTitleItem } from '../../roles.routes.schemas';

const CTX = 'PrismaRoleSearchAdapter';

export class PrismaRoleSearchAdapter extends RoleSearchPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async searchTitles(params: RoleSearchParams): Promise<RoleTitleItem[]> {
    const { tokens, wholeQuery, lang, limit } = params;
    if (tokens.length === 0) return [];
    this.logger.debug(`role search '${wholeQuery}' (${lang}, ${tokens.length} tokens)`, CTX);

    const T = ROLE_SEARCH_TIERS;
    // One expression per token: the strongest tier it hits. SQL mirror of
    // `scoreToken` — tokens arrive folded, so plain LIKE over the
    // pre-normalised column is enough.
    const tokenScores = tokens.map((token) => {
      // LIKE patterns get %/_/\ escaped so a literal "100%" can't wildcard.
      const like = token.replace(/[\\%_]/g, (c) => `\\${c}`);
      return Prisma.sql`GREATEST(
        CASE WHEN "normalizedLabel" LIKE ${like} || '%' THEN ${T.LABEL_PREFIX} ELSE 0 END,
        CASE WHEN "normalizedLabel" LIKE '% ' || ${like} || '%' THEN ${T.WORD_PREFIX} ELSE 0 END,
        CASE WHEN "normalizedLabel" LIKE '%' || ${like} || '%' THEN ${T.CONTAINS} ELSE 0 END
      )`;
    });

    // AND semantics: a row only qualifies when every token matched
    // something — i.e. its weakest token score is > 0.
    return this.prisma.$queryRaw<RoleTitleItem[]>`
      SELECT label, lang, source, "isPreferred"
      FROM (
        SELECT *,
          ${Prisma.join(tokenScores, ' + ')}
            + CASE WHEN "normalizedLabel" = ${wholeQuery} THEN ${T.EXACT_LABEL} ELSE 0 END
            + CASE WHEN "isPreferred" THEN ${T.PREFERRED_BOOST} ELSE 0 END
            AS search_score,
          LEAST(${Prisma.join(tokenScores, ', ')}) AS weakest_token_score
        FROM "RoleTitle"
        WHERE lang = ${lang}::"RoleTitleLang"
      ) ranked
      WHERE weakest_token_score > 0
      ORDER BY search_score DESC, length(label) ASC, label ASC
      LIMIT ${limit}
    `;
  }
}
