import { describe, expect, it } from 'bun:test';
import { publicResumeCacheKey, publicResumeCacheKeyPattern } from './public-resume-cache-key';

describe('publicResumeCacheKey', () => {
  it('is keyed by résumé id and locale under the public:resume namespace', () => {
    expect(publicResumeCacheKey('abc', 'pt-BR')).toBe('public:resume:abc:pt-BR');
    expect(publicResumeCacheKey('abc', 'en')).toBe('public:resume:abc:en');
  });

  it('never shares an entry between two language versions of the same résumé', () => {
    expect(publicResumeCacheKey('abc', 'pt-BR')).not.toBe(publicResumeCacheKey('abc', 'en'));
  });

  it('has a pattern that matches every language version, for invalidation', () => {
    expect(publicResumeCacheKeyPattern('abc')).toBe('public:resume:abc:*');
  });
});
