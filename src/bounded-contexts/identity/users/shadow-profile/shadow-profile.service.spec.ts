import { describe, expect, it } from 'bun:test';
import { ShadowProfileService } from './shadow-profile.service';

describe('ShadowProfileService (structural)', () => {
  it('exposes the three API methods used by the signup + admin flows', () => {
    const service = new ShadowProfileService({} as never, {} as never);
    expect(typeof service.upsertGithub).toBe('function');
    expect(typeof service.findCandidatesFor).toBe('function');
    expect(typeof service.claimForUser).toBe('function');
  });
});
