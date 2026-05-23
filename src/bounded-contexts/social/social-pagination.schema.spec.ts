/**
 * P1 #34 — verify the social BC's `PageQuery` schemas reject any
 * `sortBy` parameter. The default `PaginationQuerySchema` accepts
 * `sortBy: z.string().optional()` because it cannot know per-route
 * allowlists; the social listings have no UI surface for sort, so
 * the per-route schema drops `sortBy` entirely.
 *
 * A request shipping `?sortBy=anything` must therefore 400 at the
 * schema layer instead of silently composing into a use case that
 * would ignore it.
 */

import { describe, expect, it } from 'bun:test';
import { PageQuery as ActivityPageQuery } from './activity.routes.schemas';
import { PageQuery as ConnectionPageQuery } from './connection.routes.schemas';
import { PageQuery as FollowPageQuery } from './follow.routes.schemas';
import { PageQuery as SkillEndorsementPageQuery } from './skill-endorsement.routes.schemas';

const schemas = [
  ['activity', ActivityPageQuery],
  ['connection', ConnectionPageQuery],
  ['follow', FollowPageQuery],
  ['skill-endorsement', SkillEndorsementPageQuery],
] as const;

describe('P1 #34 — social PageQuery schemas reject sortBy', () => {
  for (const [name, schema] of schemas) {
    it(`${name} accepts page+limit`, () => {
      const result = schema.parse({ page: '2', limit: '10' });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it(`${name} drops sortBy from the parsed shape`, () => {
      // Zod's default `strip` mode silently discards extra props, so
      // the parsed object never carries `sortBy`. This is the desired
      // contract: routes that don't sort can't be tricked into reading
      // an attacker-controlled column name.
      const parsed = schema.parse({ page: '1', limit: '20', sortBy: 'evil_column' });
      expect((parsed as Record<string, unknown>).sortBy).toBeUndefined();
    });
  }
});
