import { describe, expect, it } from 'bun:test';
import { MATCH_WEIGHTS, type SubScoreKey, type SubScoreResult } from '../types';
import { blendMatch } from './blend-match.rules';

function subs(partial: Partial<Record<SubScoreKey, number | null>>) {
  const base: Record<SubScoreKey, SubScoreResult> = {
    keyword: { score: 0 },
    requirements: { score: 0 },
    semantic: { score: 0 },
    fit: { score: 0 },
  };
  for (const [k, v] of Object.entries(partial) as Array<[SubScoreKey, number | null]>) {
    base[k] = { score: v };
  }
  return base;
}

describe('blendMatch', () => {
  it('excludes Fit even when a legacy caller supplies a score', () => {
    const result = blendMatch(subs({ keyword: 80, requirements: 70, semantic: 90, fit: 60 }));
    // 80*0.3125 + 70*0.375 + 90*0.3125 = 79.375 → 79
    expect(result.overallScore).toBe(79);
    expect(result.effectiveWeights).toEqual(MATCH_WEIGHTS);
  });

  it('renormalises the weights when one sub-score is null', () => {
    const result = blendMatch(subs({ keyword: 80, requirements: 80, semantic: 80, fit: null }));
    // The three active weights already sum to 1. Fit has zero weight.
    expect(result.overallScore).toBe(80);
    expect(result.effectiveWeights.fit).toBe(0);
    const remainingSum =
      result.effectiveWeights.keyword +
      result.effectiveWeights.requirements +
      result.effectiveWeights.semantic;
    expect(remainingSum).toBeCloseTo(1, 5);
  });

  it('preserves a meaningful result when only one sub-score survives', () => {
    const result = blendMatch(subs({ keyword: 72, requirements: null, semantic: null, fit: null }));
    expect(result.overallScore).toBe(72);
    expect(result.effectiveWeights.keyword).toBe(1);
  });

  it('returns 0 when every sub-score is null (no signal at all)', () => {
    const result = blendMatch(
      subs({ keyword: null, requirements: null, semantic: null, fit: null }),
    );
    expect(result.overallScore).toBe(0);
    // Every effective weight stays 0 so the caller can tell the score
    // is meaningless and surface an "AI unavailable" banner.
    expect(Object.values(result.effectiveWeights)).toEqual([0, 0, 0, 0]);
  });

  it('returns 0 when only the inactive Fit signal is present', () => {
    const result = blendMatch(subs({ keyword: null, requirements: null, semantic: null, fit: 90 }));
    expect(result.overallScore).toBe(0);
    expect(Object.values(result.effectiveWeights)).toEqual([0, 0, 0, 0]);
  });

  it('clamps the overall score into [0, 100]', () => {
    const below = blendMatch(subs({ keyword: -10, requirements: -10, semantic: -10, fit: -10 }));
    expect(below.overallScore).toBe(0);
    const above = blendMatch(subs({ keyword: 250, requirements: 250, semantic: 250, fit: 250 }));
    expect(above.overallScore).toBe(100);
  });
});
