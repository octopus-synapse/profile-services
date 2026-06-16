import { describe, expect, it } from 'bun:test';
import { type ResumeForCompleteness, scoreCompleteness } from './completeness.rules';

function makeResume(overrides: Partial<ResumeForCompleteness> = {}): ResumeForCompleteness {
  return {
    fullName: 'Jane Doe',
    summary:
      'Senior backend engineer with 8 years experience shipping reliable services in Go and Rust for fintech.',
    jobTitle: 'Senior Backend Engineer',
    phone: '+55 11 99999-0000',
    experiences: [
      {
        startedAt: new Date('2022-01-01'),
        endedAt: new Date('2024-01-01'),
        company: 'Acme',
        role: 'Senior Engineer',
      },
    ],
    educations: [
      {
        institution: 'UFSCar',
        startedAt: new Date('2016-01-01'),
        endedAt: new Date('2020-12-01'),
      },
    ],
    skills: [{ name: 'Go' }, { name: 'Rust' }],
    ...overrides,
  };
}

describe('scoreCompleteness', () => {
  it('returns a perfect score for a fully filled resume', () => {
    const result = scoreCompleteness(makeResume());
    expect(result.score).toBe(100);
    expect(result.issues).toEqual([]);
  });

  it('emits MISSING_FULL_NAME at high severity', () => {
    const result = scoreCompleteness(makeResume({ fullName: null }));
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'CODE_MISSING_FULL_NAME', severity: 'high' }),
    );
    expect(result.score).toBeLessThan(100);
  });

  it('counts whitespace-only strings as blank', () => {
    const result = scoreCompleteness(makeResume({ fullName: '   ' }));
    expect(result.issues.some((i) => i.code === 'CODE_MISSING_FULL_NAME')).toBe(true);
  });

  it('scales summary weight for short summaries and flags with medium severity', () => {
    const result = scoreCompleteness(makeResume({ summary: 'short' }));
    expect(result.issues.find((i) => i.code === 'CODE_SUMMARY_TOO_SHORT')).toMatchObject({
      severity: 'medium',
    });
    expect(result.score).toBeLessThan(100);
  });

  it('flags missing summary with high severity', () => {
    const result = scoreCompleteness(makeResume({ summary: null }));
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'CODE_MISSING_SUMMARY', severity: 'high' }),
    );
  });

  it('detects temporal overlap between experiences', () => {
    const result = scoreCompleteness(
      makeResume({
        experiences: [
          { startedAt: new Date('2020-01-01'), endedAt: new Date('2023-01-01') },
          { startedAt: new Date('2022-06-01'), endedAt: new Date('2024-06-01') },
        ],
      }),
    );
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'CODE_TEMPORAL_OVERLAP' }),
    );
  });

  it('detects duplicate skills case-insensitively and preserves label casing', () => {
    const result = scoreCompleteness(
      makeResume({ skills: [{ name: 'Go' }, { name: 'go' }, { name: 'Rust' }] }),
    );
    const dupes = result.issues.filter((i) => i.code === 'CODE_DUPLICATE_SKILL');
    expect(dupes).toHaveLength(1);
    expect(dupes[0]?.messageArgs).toMatchObject({ skill: 'go' });
  });

  it('scores phone when loaded and flags it when blank', () => {
    const withPhone = scoreCompleteness(makeResume());
    const withoutPhone = scoreCompleteness(makeResume({ phone: null }));
    expect(withoutPhone.score).toBe(withPhone.score - 4);
    expect(withoutPhone.issues).toContainEqual(
      expect.objectContaining({ code: 'CODE_MISSING_PHONE', severity: 'medium' }),
    );
  });

  it('skips the phone rule entirely when phone is not loaded', () => {
    const result = scoreCompleteness(makeResume({ phone: undefined }));
    expect(result.issues.some((i) => i.code === 'CODE_MISSING_PHONE')).toBe(false);
    // phone weight (4) is not awarded when the field is absent
    expect(result.score).toBe(96);
  });

  it('flags entries missing a start date with the count', () => {
    const result = scoreCompleteness(
      makeResume({
        experiences: [{ company: 'Acme', role: 'Engineer' }],
        educations: [{ institution: 'UFSCar' }],
      }),
    );
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'CODE_MISSING_DATES', messageArgs: { count: 2 } }),
    );
  });

  it('awards the dates weight when every entry has a start date', () => {
    const withDates = scoreCompleteness(makeResume());
    const noStart = scoreCompleteness(
      makeResume({ experiences: [{ company: 'Acme', role: 'Engineer' }] }),
    );
    expect(noStart.score).toBe(withDates.score - 4);
  });

  it('stays within 0..100 even when every rule fails', () => {
    const empty: ResumeForCompleteness = {
      fullName: null,
      summary: null,
      jobTitle: null,
      phone: null,
      experiences: [],
      educations: [],
      skills: [],
    };
    const result = scoreCompleteness(empty);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
