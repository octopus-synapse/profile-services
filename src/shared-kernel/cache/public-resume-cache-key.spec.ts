import { describe, expect, it } from 'bun:test';
import { publicResumeCacheKey } from './public-resume-cache-key';

describe('publicResumeCacheKey', () => {
  it('is keyed by résumé id under the public:resume namespace', () => {
    expect(publicResumeCacheKey('resume-123')).toBe('public:resume:resume-123');
  });
});
