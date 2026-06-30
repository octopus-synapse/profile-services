import { describe, expect, it } from 'bun:test';
import { extractSkillKeywords } from './extract-keywords.rules';

describe('extractSkillKeywords', () => {
  it('pulls canonical skills out of free-text job copy', () => {
    const text =
      'We are hiring a Senior Engineer. Stack: React, TypeScript and Node.js on AWS. Bonus: Docker.';
    const kws = extractSkillKeywords(text);
    expect(kws).toContain('react');
    expect(kws).toContain('typescript');
    expect(kws).toContain('node.js');
    expect(kws).toContain('aws');
    expect(kws).toContain('docker');
  });

  it('does not fire "java" inside "javascript"', () => {
    const kws = extractSkillKeywords('Strong JavaScript experience required.');
    expect(kws).toContain('javascript');
    expect(kws).not.toContain('java');
  });

  it('matches multi-word and symbol skills', () => {
    const kws = extractSkillKeywords('Experience with React Native, CI/CD and machine learning.');
    expect(kws).toContain('react native');
    expect(kws).toContain('ci/cd');
    expect(kws).toContain('machine learning');
  });

  it('returns canonical spellings only — never raw prose tokens', () => {
    const kws = extractSkillKeywords('Looking for a passionate developer who loves clean code.');
    expect(kws).not.toContain('passionate');
    expect(kws).not.toContain('developer');
  });

  it('caps the result and handles empty input', () => {
    expect(extractSkillKeywords('')).toEqual([]);
    const many =
      'react vue angular svelte python java golang rust ruby php docker kubernetes aws azure gcp';
    expect(extractSkillKeywords(many, 3)).toHaveLength(3);
  });
});
