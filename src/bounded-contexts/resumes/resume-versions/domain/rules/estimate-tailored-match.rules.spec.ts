import { describe, expect, it } from 'bun:test';
import type { TailorMatchBreakdown } from '../ports/tailor-match.port';
import { estimateTailoredMatch } from './estimate-tailored-match.rules';

const breakdown = (overrides: Partial<TailorMatchBreakdown> = {}): TailorMatchBreakdown => ({
  overallScore: 72,
  keywordScore: 50,
  keywordWeight: 0.31,
  matched: ['react', 'typescript'],
  missing: ['kubernetes', 'cypress'],
  ...overrides,
});

describe('estimateTailoredMatch', () => {
  it('lifts the overall by the keyword weight times the coverage gain', () => {
    // 2/4 matched → injecting both missing keywords → 4/4 = 100.
    // lift = 0.31 * (100 - 50) = 15.5 → after = round(72 + 15.5) = 88.
    const result = estimateTailoredMatch(breakdown(), ['Kubernetes', 'cypress']);
    expect(result).toEqual({ before: 72, after: 88, estimated: true });
  });

  it('only counts injected keywords that were actually missing', () => {
    // "react" was already matched; only "cypress" moves. 3/4 = 75.
    // lift = 0.31 * (75 - 50) = 7.75 → after = round(72 + 7.75) = 80.
    const result = estimateTailoredMatch(breakdown(), ['react', 'cypress']);
    expect(result.after).toBe(80);
  });

  it('matches keywords case-insensitively and ignores blanks', () => {
    const result = estimateTailoredMatch(breakdown(), ['  ', 'CYPRESS ']);
    expect(result.after).toBeGreaterThan(result.before);
  });

  it('returns after === before when nothing injected covers a gap', () => {
    const result = estimateTailoredMatch(breakdown(), ['graphql']);
    expect(result).toEqual({ before: 72, after: 72, estimated: true });
  });

  it('returns after === before when the keyword signal is unavailable', () => {
    const result = estimateTailoredMatch(breakdown({ keywordScore: null }), ['kubernetes']);
    expect(result.after).toBe(result.before);
  });

  it('never decreases and never exceeds 100', () => {
    const high = estimateTailoredMatch(
      breakdown({ overallScore: 99, keywordScore: 0, matched: [], missing: ['a'] }),
      ['a'],
    );
    expect(high.after).toBeLessThanOrEqual(100);
    expect(high.after).toBeGreaterThanOrEqual(high.before);
  });

  it('rounds the before score defensively', () => {
    const result = estimateTailoredMatch(breakdown({ overallScore: 71.6 }), []);
    expect(result.before).toBe(72);
  });
});
