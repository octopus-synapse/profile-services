import { describe, expect, it } from 'bun:test';
import {
  BIG_FIVE_DIMENSIONS,
  FIT_DIMENSIONS,
  QUESTION_SET_SIZE,
  SCHWARTZ_DIMENSIONS,
  SDT_DIMENSIONS,
} from '../types';
import {
  buildQuestionSetSeed,
  type SampleableQuestion,
  sampleQuestions,
  seededShuffle,
} from './fit-sampler.rules';

/** Build a rich pool — 8 questions per dimension → 8 * 18 = 144 items,
 * comfortably above the sampler budget. */
function buildPool(perDimension = 8): SampleableQuestion[] {
  const pool: SampleableQuestion[] = [];
  for (const dimension of FIT_DIMENSIONS) {
    for (let i = 0; i < perDimension; i++) {
      pool.push({ id: `${dimension}:${i}`, dimension });
    }
  }
  return pool;
}

describe('sampleQuestions', () => {
  it('returns exactly 25 questions for a healthy pool', () => {
    const sampled = sampleQuestions(buildPool(), 'seed-a');
    expect(sampled).toHaveLength(QUESTION_SET_SIZE);
  });

  it('is idempotent for the same (pool, seed)', () => {
    const pool = buildPool();
    const a = sampleQuestions(pool, 'seed-a').map((q) => q.id);
    const b = sampleQuestions(pool, 'seed-a').map((q) => q.id);
    expect(a).toEqual(b);
  });

  it('produces a different ordering for a different seed', () => {
    const pool = buildPool();
    const a = sampleQuestions(pool, 'seed-a').map((q) => q.id);
    const b = sampleQuestions(pool, 'seed-b').map((q) => q.id);
    expect(a).not.toEqual(b);
  });

  it('stratifies the 25 sample across the three blocks', () => {
    const sampled = sampleQuestions(buildPool(), 'seed-a');
    const bigFive = sampled.filter((q) => BIG_FIVE_DIMENSIONS.includes(q.dimension));
    const schwartz = sampled.filter((q) => SCHWARTZ_DIMENSIONS.includes(q.dimension));
    const sdt = sampled.filter((q) => SDT_DIMENSIONS.includes(q.dimension));
    expect(bigFive.length + schwartz.length + sdt.length).toBe(QUESTION_SET_SIZE);
    expect(bigFive.length).toBeGreaterThan(0);
    expect(schwartz.length).toBeGreaterThan(0);
    expect(sdt.length).toBeGreaterThan(0);
  });

  it('covers every dimension at least once when the pool allows', () => {
    const sampled = sampleQuestions(buildPool(), 'seed-a');
    const seen = new Set(sampled.map((q) => q.dimension));
    for (const dimension of FIT_DIMENSIONS) {
      expect(seen.has(dimension)).toBe(true);
    }
  });

  it('degrades gracefully for a thin pool without throwing', () => {
    // Only one question per Big Five dimension, zero for Schwartz/SDT.
    const thin: SampleableQuestion[] = BIG_FIVE_DIMENSIONS.map((dimension) => ({
      id: `${dimension}:0`,
      dimension,
    }));
    const sampled = sampleQuestions(thin, 'seed-a');
    expect(sampled.length).toBe(BIG_FIVE_DIMENSIONS.length);
    expect(new Set(sampled.map((q) => q.id)).size).toBe(sampled.length);
  });

  it('never returns duplicate question ids', () => {
    const sampled = sampleQuestions(buildPool(), 'seed-a');
    const ids = sampled.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('seededShuffle', () => {
  it('is deterministic for the same seed', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const a = seededShuffle(items, 'x');
    const b = seededShuffle(items, 'x');
    expect(a).toEqual(b);
  });

  it('differs when the seed changes', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const a = seededShuffle(items, 'x');
    const b = seededShuffle(items, 'y');
    expect(a).not.toEqual(b);
  });

  it('preserves the multiset of items', () => {
    const items = [1, 2, 3, 4, 5];
    const shuffled = seededShuffle(items, 'x');
    expect([...shuffled].sort()).toEqual([...items].sort());
  });
});

describe('buildQuestionSetSeed', () => {
  it('mixes user + generation so remap slots get distinct seeds', () => {
    const a = buildQuestionSetSeed('user-1', 1);
    const b = buildQuestionSetSeed('user-1', 2);
    const c = buildQuestionSetSeed('user-2', 1);
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});
