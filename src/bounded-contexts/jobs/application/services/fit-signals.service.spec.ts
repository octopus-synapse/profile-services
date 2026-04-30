import { describe, expect, it } from 'bun:test';
import { extractSoftSignals, percentOverlap } from './fit-signals.service';

describe('percentOverlap', () => {
  it('returns 0 when needles is empty', () => {
    expect(percentOverlap([], ['typescript'])).toBe(0);
  });

  it('matches case-insensitively and returns the rounded coverage percentage', () => {
    expect(percentOverlap(['TypeScript', 'Postgres', 'rust'], ['typescript', 'postgres'])).toBe(67);
  });

  it('returns 100 when every needle is present', () => {
    expect(percentOverlap(['a', 'b'], ['a', 'b', 'c'])).toBe(100);
  });
});

describe('extractSoftSignals', () => {
  it('returns empty for null/undefined/empty text', () => {
    expect(extractSoftSignals(null)).toEqual([]);
    expect(extractSoftSignals(undefined)).toEqual([]);
    expect(extractSoftSignals('')).toEqual([]);
  });

  it('picks up known soft-skill keywords case-insensitively', () => {
    const result = extractSoftSignals('Strong COMMUNICATION and stakeholder ownership required');
    expect(result).toContain('communication');
    expect(result).toContain('stakeholder');
    expect(result).toContain('ownership');
  });
});
