import { describe, expect, it } from 'bun:test';
import type { FitDimension } from '../types';
import {
  applyReverse,
  concatVector,
  normalizeRaw,
  type ScoredAnswer,
  vectoriseAnswers,
} from './fit-vectoriser.rules';

function likertAnswer(
  dimension: FitDimension,
  rawValue: number,
  overrides: Partial<ScoredAnswer> = {},
): ScoredAnswer {
  return {
    dimension,
    scaleType: 'likert5',
    weight: 1,
    rawValue,
    ...overrides,
  };
}

describe('normalizeRaw', () => {
  it('maps likert5 1..5 to 0..1 linearly', () => {
    expect(normalizeRaw(1, 'likert5')).toBe(0);
    expect(normalizeRaw(3, 'likert5')).toBe(0.5);
    expect(normalizeRaw(5, 'likert5')).toBe(1);
  });

  it('clamps out-of-range likert values rather than throwing', () => {
    expect(normalizeRaw(0, 'likert5')).toBe(0);
    expect(normalizeRaw(99, 'likert5')).toBe(1);
  });

  it('treats binary as hard 0/1', () => {
    expect(normalizeRaw(0, 'binary')).toBe(0);
    expect(normalizeRaw(1, 'binary')).toBe(1);
    expect(normalizeRaw(2, 'binary')).toBe(1);
  });
});

describe('applyReverse', () => {
  it('inverts the score when reverse=true', () => {
    expect(applyReverse(0.2, true)).toBeCloseTo(0.8, 5);
    expect(applyReverse(0.8, true)).toBeCloseTo(0.2, 5);
  });

  it('leaves the score untouched when reverse=false', () => {
    expect(applyReverse(0.2, false)).toBe(0.2);
  });
});

describe('vectoriseAnswers', () => {
  it('buckets answers into the right block', () => {
    const vector = vectoriseAnswers([
      likertAnswer('BIG_FIVE_OPENNESS', 5),
      likertAnswer('SCHWARTZ_ACHIEVEMENT', 3),
      likertAnswer('SDT_AUTONOMY', 1),
    ]);
    expect(vector.bigFive.BIG_FIVE_OPENNESS).toBe(1);
    expect(vector.schwartz.SCHWARTZ_ACHIEVEMENT).toBe(0.5);
    expect(vector.sdt.SDT_AUTONOMY).toBe(0);
  });

  it('weighted-averages multiple answers for the same dimension', () => {
    // Two likert items: raw 5 (→1) and raw 1 (→0). Equal weight → mean 0.5.
    const vector = vectoriseAnswers([
      likertAnswer('BIG_FIVE_CONSCIENTIOUSNESS', 5),
      likertAnswer('BIG_FIVE_CONSCIENTIOUSNESS', 1),
    ]);
    expect(vector.bigFive.BIG_FIVE_CONSCIENTIOUSNESS).toBeCloseTo(0.5, 3);
  });

  it('weights affect the mean proportionally', () => {
    const vector = vectoriseAnswers([
      likertAnswer('BIG_FIVE_EXTRAVERSION', 5, { weight: 3 }), // normalized=1
      likertAnswer('BIG_FIVE_EXTRAVERSION', 1, { weight: 1 }), // normalized=0
    ]);
    // (1*3 + 0*1) / 4 = 0.75
    expect(vector.bigFive.BIG_FIVE_EXTRAVERSION).toBeCloseTo(0.75, 3);
  });

  it('reverse-scored items invert before averaging', () => {
    const vector = vectoriseAnswers([
      likertAnswer('BIG_FIVE_NEUROTICISM', 1, { reverse: true }), // normalized=0 → reversed=1
    ]);
    expect(vector.bigFive.BIG_FIVE_NEUROTICISM).toBe(1);
  });

  it('falls back to weight=1 when an adapter passes a zero/negative weight', () => {
    const vector = vectoriseAnswers([
      likertAnswer('SCHWARTZ_POWER', 5, { weight: 0 }),
      likertAnswer('SCHWARTZ_POWER', 1, { weight: -5 }),
    ]);
    // Both degenerate weights become 1 → mean of (1,0) = 0.5
    expect(vector.schwartz.SCHWARTZ_POWER).toBeCloseTo(0.5, 3);
  });

  it('omits dimensions that were never answered', () => {
    const vector = vectoriseAnswers([likertAnswer('BIG_FIVE_OPENNESS', 5)]);
    expect(vector.bigFive.BIG_FIVE_OPENNESS).toBe(1);
    expect(vector.bigFive.BIG_FIVE_EXTRAVERSION).toBeUndefined();
    expect(vector.schwartz).toEqual({});
    expect(vector.sdt).toEqual({});
  });

  it('rounds scores to 3 decimals so the persisted JSON stays compact', () => {
    const vector = vectoriseAnswers([
      likertAnswer('BIG_FIVE_AGREEABLENESS', 2), // 0.25
      likertAnswer('BIG_FIVE_AGREEABLENESS', 3), // 0.5
      likertAnswer('BIG_FIVE_AGREEABLENESS', 4), // 0.75
    ]);
    // mean = 0.5
    expect(vector.bigFive.BIG_FIVE_AGREEABLENESS).toBe(0.5);
  });
});

describe('concatVector', () => {
  it('produces a stable ordering aligned with FIT_DIMENSIONS', () => {
    const vector = vectoriseAnswers([
      likertAnswer('BIG_FIVE_OPENNESS', 5),
      likertAnswer('SCHWARTZ_BENEVOLENCE', 3),
      likertAnswer('SDT_COMPETENCE', 1),
    ]);
    const flat = concatVector(vector);
    expect(flat[0]).toBe(1); // BIG_FIVE_OPENNESS (index 0)
    expect(flat[13]).toBe(0.5); // SCHWARTZ_BENEVOLENCE (index 13)
    expect(flat[16]).toBe(0); // SDT_COMPETENCE (index 16)
  });

  it('emits null for missing dimensions so similarity can decide the fallback', () => {
    const vector = vectoriseAnswers([likertAnswer('BIG_FIVE_OPENNESS', 5)]);
    const flat = concatVector(vector);
    expect(flat[0]).toBe(1);
    for (let i = 1; i < flat.length; i++) expect(flat[i]).toBeNull();
  });
});
