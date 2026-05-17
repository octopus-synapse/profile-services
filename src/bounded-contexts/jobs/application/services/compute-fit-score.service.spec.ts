import { describe, expect, it } from 'bun:test';
import { computeFitScore } from './compute-fit-score.service';

describe('computeFitScore', () => {
  it('scores 100 when every factor matches perfectly', () => {
    const result = computeFitScore({
      resumeSkills: ['TypeScript', 'Postgres', 'Docker'],
      resumeEnglish: 'ADVANCED',
      resumeRemotePref: 'REMOTE',
      jobSkills: ['typescript', 'postgres', 'docker'],
      jobMinEnglish: 'INTERMEDIATE',
      jobRemotePolicy: 'REMOTE',
    });
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.score).toBe(100);
    expect(result.breakdown.missingSkills).toEqual([]);
  });

  it('ignores case and whitespace when matching skills', () => {
    const result = computeFitScore({
      resumeSkills: ['  TypeScript ', 'Postgres'],
      jobSkills: ['typescript'],
    });
    expect(result?.breakdown.matchedSkills).toEqual(['typescript']);
  });

  it('penalises partial skill overlap proportionally', () => {
    const result = computeFitScore({
      resumeSkills: ['typescript'],
      jobSkills: ['typescript', 'rust', 'go', 'kubernetes'],
    });
    expect(result).not.toBeNull();
    if (!result) return;

    // 1/4 skill overlap → 17.5 from skills, +20 english default (no requirement) + 5 remote default
    expect(result.score).toBeLessThan(50);
    expect(result.breakdown.missingSkills.length).toBe(3);
  });

  it('zeros english factor when resume is below the required level', () => {
    const result = computeFitScore({
      resumeSkills: ['typescript'],
      resumeEnglish: 'BASIC',
      jobSkills: ['typescript'],
      jobMinEnglish: 'ADVANCED',
    });
    expect(result?.breakdown.englishMatch).toBe(0);
  });

  it('treats missing english requirement as neutral (1)', () => {
    const result = computeFitScore({
      resumeSkills: ['typescript'],
      jobSkills: ['typescript'],
    });
    expect(result?.breakdown.englishMatch).toBe(1);
  });

  it('rewards aligned remote preferences fully', () => {
    const result = computeFitScore({
      resumeSkills: ['typescript'],
      resumeRemotePref: 'REMOTE',
      jobSkills: ['typescript'],
      jobRemotePolicy: 'REMOTE',
    });
    expect(result?.breakdown.remoteMatch).toBe(1);
  });

  it('clamps output to 0..100', () => {
    const result = computeFitScore({
      resumeSkills: ['x'],
      resumeEnglish: 'BASIC',
      resumeRemotePref: 'ONSITE',
      jobSkills: ['unicorn'],
      jobMinEnglish: 'FLUENT',
      jobRemotePolicy: 'REMOTE',
    });
    expect(result?.score).toBeGreaterThanOrEqual(0);
    expect(result?.score).toBeLessThanOrEqual(100);
  });

  // P1 #37
  it('returns null when jobSkills is empty (no signal to score)', () => {
    const result = computeFitScore({
      resumeSkills: ['typescript', 'rust'],
      jobSkills: [],
    });
    expect(result).toBeNull();
  });

  it('returns null when resumeSkills is empty (no signal to score)', () => {
    const result = computeFitScore({
      resumeSkills: [],
      jobSkills: ['typescript'],
    });
    expect(result).toBeNull();
  });
});
