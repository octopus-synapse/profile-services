import { describe, expect, it } from 'bun:test';
import { scoreKeywordMatch } from './keyword-match.rules';

describe('scoreKeywordMatch', () => {
  it('returns 100 with no matches when the job has no required keywords', () => {
    const result = scoreKeywordMatch({ required: [], candidate: ['Rust'] });
    expect(result.score).toBe(100);
    expect(result.detail.matched).toEqual([]);
    expect(result.detail.missing).toEqual([]);
  });

  it('matches case-insensitively', () => {
    const result = scoreKeywordMatch({
      required: ['rust', 'tokio'],
      candidate: ['Rust', 'TOKIO'],
    });
    expect(result.score).toBe(100);
    expect(result.detail.missing).toEqual([]);
  });

  it('resolves curated synonyms (k8s ↔ kubernetes, js ↔ javascript)', () => {
    const result = scoreKeywordMatch({
      required: ['Kubernetes', 'JavaScript'],
      candidate: ['K8s', 'JS'],
    });
    expect(result.score).toBe(100);
  });

  it('emits misses with the original casing for UI display', () => {
    const result = scoreKeywordMatch({
      required: ['Rust', 'Kubernetes'],
      candidate: ['Rust'],
    });
    expect(result.score).toBe(50);
    expect(result.detail.matched).toEqual(['Rust']);
    expect(result.detail.missing).toEqual(['Kubernetes']);
  });

  it('dedupes the required side so duplicates cannot inflate denominator', () => {
    const result = scoreKeywordMatch({
      required: ['Rust', 'rust', 'RUST'],
      candidate: ['Rust'],
    });
    expect(result.score).toBe(100);
    expect(result.detail.matched).toEqual(['Rust']);
  });

  it('returns 0 when no required keyword is present in the candidate list', () => {
    const result = scoreKeywordMatch({ required: ['Rust'], candidate: ['Python'] });
    expect(result.score).toBe(0);
    expect(result.detail.missing).toEqual(['Rust']);
  });
});
