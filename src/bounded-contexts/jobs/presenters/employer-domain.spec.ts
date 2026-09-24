import { describe, expect, it } from 'bun:test';
import { employerDomain } from './employer-domain';

describe('employer domain provenance', () => {
  it('normalizes employer websites without guessing from the application board', () => {
    expect(employerDomain({ employer_website: 'https://www.Example.com/careers' })).toBe(
      'example.com',
    );
    expect(employerDomain({ employer_website: 'example.com' })).toBe('example.com');
    expect(employerDomain({ job_apply_link: 'https://linkedin.com/jobs/1' })).toBeNull();
  });
  it('rejects malformed and non-web values', () => {
    for (const website of [
      '',
      'javascript:alert(1)',
      'https://user:pass@example.com',
      'ftp://example.com',
      null,
      {},
    ]) {
      expect(employerDomain({ employer_website: website })).toBeNull();
    }
  });
});
