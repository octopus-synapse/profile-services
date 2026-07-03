import { describe, expect, it } from 'bun:test';
import {
  blendReadiness,
  scoreCoverage,
  scoreFitFreshness,
  scoreOverlapCoverage,
} from './blend-readiness.rules';
import {
  READINESS_COVERAGE_TARGET,
  READINESS_WEIGHTS,
  type ReadinessFactorKey,
  type ReadinessFactorResult,
} from './readiness.types';

function factors(partial: Partial<Record<ReadinessFactorKey, number | null>>) {
  const base: Record<ReadinessFactorKey, ReadinessFactorResult> = {
    quality: { score: 0 },
    coverage: { score: 0 },
    fit: { score: 0 },
  };
  for (const [k, v] of Object.entries(partial) as Array<[ReadinessFactorKey, number | null]>) {
    base[k] = { score: v };
  }
  return base;
}

describe('scoreCoverage', () => {
  it('is 0 for no keywords', () => {
    expect(scoreCoverage(0)).toBe(0);
  });

  it('saturates at 100 once the target is reached', () => {
    expect(scoreCoverage(READINESS_COVERAGE_TARGET)).toBe(100);
    expect(scoreCoverage(READINESS_COVERAGE_TARGET * 2)).toBe(100);
  });

  it('scales linearly below the target', () => {
    expect(scoreCoverage(READINESS_COVERAGE_TARGET / 2)).toBe(50);
  });
});

describe('scoreOverlapCoverage', () => {
  it('is the fraction of role skills the résumé covers, case-insensitive', () => {
    // role has 4 skills; résumé covers 2 (react + Docker) → 50
    expect(
      scoreOverlapCoverage(
        ['React', 'docker', 'unrelated'],
        ['react', 'DOCKER', 'kafka', 'terraform'],
      ),
    ).toBe(50);
  });

  it('returns null when the role skill set is empty (caller falls back)', () => {
    expect(scoreOverlapCoverage(['react'], [])).toBeNull();
  });

  it('is 0 when there is no overlap', () => {
    expect(scoreOverlapCoverage(['php'], ['rust', 'go'])).toBe(0);
  });
});

describe('scoreFitFreshness', () => {
  it('maps status to a sub-score', () => {
    expect(scoreFitFreshness('responded')).toBe(100);
    expect(scoreFitFreshness('expired')).toBe(40);
    expect(scoreFitFreshness('never')).toBe(0);
  });
});

describe('blendReadiness', () => {
  it('returns the exact weighted average when all factors are present', () => {
    const result = blendReadiness(factors({ quality: 80, coverage: 60, fit: 100 }));
    // 80*0.55 + 60*0.25 + 100*0.20 = 44 + 15 + 20 = 79
    expect(result.overallScore).toBe(79);
    expect(result.effectiveWeights).toEqual(READINESS_WEIGHTS);
  });

  it('renormalises when quality is unavailable (brand-new resume)', () => {
    const result = blendReadiness(factors({ quality: null, coverage: 80, fit: 80 }));
    // quality dropped → coverage(0.25)+fit(0.20)=0.45; both 80 → 80
    expect(result.overallScore).toBe(80);
    expect(result.effectiveWeights.quality).toBe(0);
    expect(result.effectiveWeights.coverage + result.effectiveWeights.fit).toBeCloseTo(1, 5);
  });

  it('returns 0 (not NaN) when no factor is available', () => {
    const result = blendReadiness(factors({ quality: null, coverage: null, fit: null }));
    expect(result.overallScore).toBe(0);
  });
});
