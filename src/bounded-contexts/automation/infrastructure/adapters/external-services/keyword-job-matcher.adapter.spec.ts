import { describe, expect, it } from 'bun:test';
import { keywordMatchScore } from './keyword-job-matcher.adapter';

describe('keywordMatchScore', () => {
  it('is the share of the job text catalogue terms the resume also has', () => {
    const job = 'We need React, TypeScript and Docker experience.';
    expect(keywordMatchScore('React and TypeScript developer', job)).toBe(67);
    expect(keywordMatchScore('React TypeScript Docker', job)).toBe(100);
  });

  it('is zero when the job text names no catalogue term', () => {
    expect(keywordMatchScore('anything', 'a job with no recognisable terms')).toBe(0);
  });

  it('matches case-insensitively', () => {
    expect(keywordMatchScore('kubernetes', 'Kubernetes required')).toBe(100);
  });
});
