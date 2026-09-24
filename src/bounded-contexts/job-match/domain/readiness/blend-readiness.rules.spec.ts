import { describe, expect, it } from 'bun:test';
import { blendReadiness, scoreCoverage, scoreOverlapCoverage } from './blend-readiness.rules';
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

describe('blendReadiness', () => {
  it('returns the exact weighted average when all factors are present', () => {
    const result = blendReadiness(factors({ quality: 80, coverage: 60, fit: 100 }));
    // Fit is ignored even if a legacy caller supplies it.
    // 80*0.6875 + 60*0.3125 = 73.75 → 74
    expect(result.overallScore).toBe(74);
    expect(result.effectiveWeights).toEqual(READINESS_WEIGHTS);
  });

  it('renormalises when quality is unavailable (brand-new resume)', () => {
    const result = blendReadiness(factors({ quality: null, coverage: 80, fit: 80 }));
    expect(result.overallScore).toBe(80);
    expect(result.effectiveWeights.quality).toBe(0);
    expect(result.effectiveWeights.coverage).toBe(1);
    expect(result.effectiveWeights.fit).toBe(0);
  });

  it('returns 0 (not NaN) when no factor is available', () => {
    const result = blendReadiness(factors({ quality: null, coverage: null, fit: null }));
    expect(result.overallScore).toBe(0);
  });
});
