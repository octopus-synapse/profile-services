import { StyleScorerPort } from '../../domain/ports/style-scorer.port';
import { StyleScoringCatalogPort } from '../../domain/ports/style-scoring-catalog.port';
import { scoreStyle } from '../../domain/rules/style-criteria/score-style';
import type { StyleScoreInput, StyleScoreResult } from '../../domain/types';

/**
 * Data-driven Style Scorer.
 *
 * Loads the active rubric criteria from the catalog and delegates the
 * actual scoring to the pure `scoreStyle` rule. Framework-free POJO;
 * wired by `resume-styles.composition.ts`.
 */
export class StyleScorerAdapter extends StyleScorerPort {
  constructor(private readonly catalog: StyleScoringCatalogPort) {
    super();
  }

  async score(input: StyleScoreInput): Promise<StyleScoreResult> {
    const criteria = await this.catalog.loadCriteria();
    return scoreStyle(input, criteria);
  }
}
