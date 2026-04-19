import { describe, expect, it } from 'bun:test';
import { computeFitScore } from './compute-fit-score';

describe('computeFitScore', () => {
  it('scores 100 when every factor matches perfectly', () => {
    const { score, breakdown } = computeFitScore({
      resumeSkills: ['TypeScript', 'Postgres', 'Docker'],
      resumeEnglish: 'ADVANCED',
      resumeRemotePref: 'REMOTE',
      jobSkills: ['typescript', 'postgres', 'docker'],
      jobMinEnglish: 'INTERMEDIATE',
      jobRemotePolicy: 'REMOTE',
    });

    expect(score).toBe(100);
    expect(breakdown.missingSkills).toEqual([]);
  });

  it('ignores case and whitespace when matching skills', () => {
    const { breakdown } = computeFitScore({
      resumeSkills: ['  TypeScript ', 'Postgres'],
      jobSkills: ['typescript'],
    });
    expect(breakdown.matchedSkills).toEqual(['typescript']);
  });

  it('penalises partial skill overlap proportionally', () => {
    const result = computeFitScore({
      resumeSkills: ['typescript'],
      jobSkills: ['typescript', 'rust', 'go', 'kubernetes'],
    });

    // 1/4 skill overlap → 17.5 from skills, +20 english default (no requirement) + 5 remote default
    expect(result.score).toBeLessThan(50);
    expect(result.breakdown.missingSkills.length).toBe(3);
  });

  it('zeros english factor when resume is below the required level', () => {
    const { breakdown } = computeFitScore({
      resumeSkills: ['typescript'],
      resumeEnglish: 'BASIC',
      jobSkills: ['typescript'],
      jobMinEnglish: 'ADVANCED',
    });
    expect(breakdown.englishMatch).toBe(0);
  });

  it('treats missing english requirement as neutral (1)', () => {
    const { breakdown } = computeFitScore({
      resumeSkills: ['typescript'],
      jobSkills: ['typescript'],
    });
    expect(breakdown.englishMatch).toBe(1);
  });

  it('rewards aligned remote preferences fully', () => {
    const { breakdown } = computeFitScore({
      resumeSkills: [],
      resumeRemotePref: 'REMOTE',
      jobSkills: [],
      jobRemotePolicy: 'REMOTE',
    });
    expect(breakdown.remoteMatch).toBe(1);
  });

  it('clamps output to 0..100', () => {
    const { score } = computeFitScore({
      resumeSkills: [],
      resumeEnglish: 'BASIC',
      resumeRemotePref: 'ONSITE',
      jobSkills: ['unicorn'],
      jobMinEnglish: 'FLUENT',
      jobRemotePolicy: 'REMOTE',
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
