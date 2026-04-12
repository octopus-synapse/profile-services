import type { ThemeForScoring, ThemeScorerPort } from '../../../domain/ports/ats-scorer.port';
import type { AtsScore } from '../../../domain/value-objects/ats-score';

export class ScoreThemeUseCase {
  constructor(private readonly scorer: ThemeScorerPort) {}

  execute(theme: ThemeForScoring): AtsScore {
    return this.scorer.scoreTheme(theme);
  }
}
