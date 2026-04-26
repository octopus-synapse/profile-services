import { describe, expect, it } from 'bun:test';
import type { FitVector } from '../types';
import { cosineToScore, weightedCosineScore } from './fit-similarity.rules';

function vector(overrides: Partial<FitVector> = {}): FitVector {
  return {
    bigFive: {},
    schwartz: {},
    sdt: {},
    ...overrides,
  };
}

describe('cosineToScore', () => {
  it('maps -1 to 0 and +1 to 100', () => {
    expect(cosineToScore(-1)).toBe(0);
    expect(cosineToScore(1)).toBe(100);
  });
  it('maps 0 to 50', () => {
    expect(cosineToScore(0)).toBe(50);
  });
});

describe('weightedCosineScore', () => {
  it('returns 100 for two identical non-neutral vectors', () => {
    const v: FitVector = vector({
      bigFive: {
        BIG_FIVE_OPENNESS: 1,
        BIG_FIVE_CONSCIENTIOUSNESS: 0.8,
        BIG_FIVE_EXTRAVERSION: 0.2,
        BIG_FIVE_AGREEABLENESS: 0.6,
        BIG_FIVE_NEUROTICISM: 0.4,
      },
      schwartz: {
        SCHWARTZ_SELF_DIRECTION: 0.9,
        SCHWARTZ_STIMULATION: 0.3,
        SCHWARTZ_HEDONISM: 0.7,
        SCHWARTZ_ACHIEVEMENT: 0.8,
        SCHWARTZ_POWER: 0.2,
        SCHWARTZ_SECURITY: 0.5,
        SCHWARTZ_CONFORMITY: 0.4,
        SCHWARTZ_TRADITION: 0.3,
        SCHWARTZ_BENEVOLENCE: 0.9,
        SCHWARTZ_UNIVERSALISM: 0.8,
      },
      sdt: { SDT_AUTONOMY: 0.7, SDT_COMPETENCE: 0.9, SDT_RELATEDNESS: 0.8 },
    });
    expect(weightedCosineScore(v, v)).toBe(100);
  });

  it('returns 0 for perfectly opposed non-neutral vectors', () => {
    const a: FitVector = vector({
      bigFive: { BIG_FIVE_OPENNESS: 1, BIG_FIVE_CONSCIENTIOUSNESS: 1 },
      schwartz: { SCHWARTZ_SELF_DIRECTION: 1 },
      sdt: { SDT_AUTONOMY: 1 },
    });
    const b: FitVector = vector({
      bigFive: { BIG_FIVE_OPENNESS: 0, BIG_FIVE_CONSCIENTIOUSNESS: 0 },
      schwartz: { SCHWARTZ_SELF_DIRECTION: 0 },
      sdt: { SDT_AUTONOMY: 0 },
    });
    expect(weightedCosineScore(a, b)).toBe(0);
  });

  it('returns ~50 for orthogonal-enough vectors', () => {
    const a: FitVector = vector({
      bigFive: { BIG_FIVE_OPENNESS: 1, BIG_FIVE_CONSCIENTIOUSNESS: 0 },
      schwartz: { SCHWARTZ_SELF_DIRECTION: 1, SCHWARTZ_STIMULATION: 0 },
      sdt: { SDT_AUTONOMY: 1, SDT_COMPETENCE: 0 },
    });
    const b: FitVector = vector({
      bigFive: { BIG_FIVE_OPENNESS: 0, BIG_FIVE_CONSCIENTIOUSNESS: 1 },
      schwartz: { SCHWARTZ_SELF_DIRECTION: 0, SCHWARTZ_STIMULATION: 1 },
      sdt: { SDT_AUTONOMY: 0, SDT_COMPETENCE: 1 },
    });
    expect(weightedCosineScore(a, b)).toBe(0); // strictly opposed in every block
  });

  it('returns 100 when both sides are exactly neutral (no information)', () => {
    // Two flat vectors at 0.5 are ambivalent but consistent — treat as identical.
    const neutral = vector({
      bigFive: { BIG_FIVE_OPENNESS: 0.5 },
      schwartz: { SCHWARTZ_POWER: 0.5 },
      sdt: { SDT_AUTONOMY: 0.5 },
    });
    expect(weightedCosineScore(neutral, neutral)).toBe(100);
  });

  it('skips a block that has no overlap and keeps the remaining blocks proportional', () => {
    const a: FitVector = vector({
      bigFive: { BIG_FIVE_OPENNESS: 1 },
      // no schwartz
      sdt: { SDT_AUTONOMY: 1 },
    });
    const b: FitVector = vector({
      bigFive: { BIG_FIVE_OPENNESS: 1 },
      schwartz: { SCHWARTZ_POWER: 0.9 },
      sdt: { SDT_AUTONOMY: 1 },
    });
    // Big Five + SDT perfectly match; Schwartz has no overlap on A's side → skipped.
    expect(weightedCosineScore(a, b)).toBe(100);
  });

  it('returns null when there is no overlap at all', () => {
    const a: FitVector = vector({ bigFive: { BIG_FIVE_OPENNESS: 1 } });
    const b: FitVector = vector({ schwartz: { SCHWARTZ_POWER: 1 } });
    expect(weightedCosineScore(a, b)).toBeNull();
  });
});
