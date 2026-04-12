import { describe, expect, it } from 'bun:test';
import type { ThemeForScoring, ThemeScorerPort } from '../../../domain/ports/ats-scorer.port';
import type { AtsScoreBreakdown } from '../../../domain/value-objects/ats-score';
import { AtsScore } from '../../../domain/value-objects/ats-score';
import { ScoreThemeUseCase } from './score-theme.use-case';

const makeBreakdown = (): AtsScoreBreakdown[] => [
  { criterion: 'layout', score: 90, weight: 0.5, recommendation: 'Good layout' },
  { criterion: 'typography', score: 70, weight: 0.3, recommendation: 'Increase font size' },
  { criterion: 'colorContrast', score: 85, weight: 0.2 },
];

const makeTheme = (): ThemeForScoring => ({
  id: 'theme-1',
  tokens: { fontSize: '14px', fontFamily: 'Arial' },
  layout: { columns: 1 },
});

class StubThemeScorer implements ThemeScorerPort {
  private result: AtsScore;

  constructor(result: AtsScore) {
    this.result = result;
  }

  scoreTheme(_theme: ThemeForScoring): AtsScore {
    return this.result;
  }
}

describe('ScoreThemeUseCase', () => {
  it('should delegate scoring to ThemeScorerPort', () => {
    const breakdown = makeBreakdown();
    const expected = AtsScore.fromBreakdown(breakdown);
    const scorer = new StubThemeScorer(expected);
    const useCase = new ScoreThemeUseCase(scorer);

    const result = useCase.execute(makeTheme());

    expect(result).toBe(expected);
  });

  it('should return the AtsScore from the scorer', () => {
    const expected = new AtsScore(42, [], []);
    const scorer = new StubThemeScorer(expected);
    const useCase = new ScoreThemeUseCase(scorer);

    const result = useCase.execute(makeTheme());

    expect(result.overall).toBe(42);
    expect(result.breakdown).toEqual([]);
    expect(result.recommendations).toEqual([]);
  });

  it('should pass the theme to the scorer', () => {
    let capturedTheme: ThemeForScoring | undefined;

    const scorer: ThemeScorerPort = {
      scoreTheme(theme: ThemeForScoring): AtsScore {
        capturedTheme = theme;
        return new AtsScore(80, [], []);
      },
    };

    const useCase = new ScoreThemeUseCase(scorer);
    const theme = makeTheme();
    useCase.execute(theme);

    expect(capturedTheme).toEqual(theme);
  });
});
