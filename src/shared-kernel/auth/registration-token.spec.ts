import { describe, expect, it } from 'bun:test';
import {
  issueRegistrationToken,
  REGISTRATION_TOKEN_TTL_MS,
  verifyRegistrationToken,
} from './registration-token';
import { signState } from './signed-state-cookie';

const SECRET = 'a-test-secret-at-least-32-characters-long';

describe('registration token', () => {
  it('round-trips the verified e-mail (dots and all)', () => {
    const token = issueRegistrationToken('jane.doe@example.com', SECRET);
    expect(verifyRegistrationToken(token, SECRET)).toBe('jane.doe@example.com');
  });

  it('rejects a token signed with a different secret', () => {
    const token = issueRegistrationToken('jane@example.com', 'another-secret-32-characters-long!!');
    expect(verifyRegistrationToken(token, SECRET)).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = issueRegistrationToken('jane@example.com', SECRET);
    const later = Date.now() + REGISTRATION_TOKEN_TTL_MS + 1000;
    expect(verifyRegistrationToken(token, SECRET, () => later)).toBeNull();
  });

  it('rejects other signed-state artifacts (no purpose prefix)', () => {
    // e.g. an OAuth `state` cookie signed with the same secret.
    const foreign = signState(Buffer.from('deadbeef', 'utf8').toString('base64url'), SECRET);
    expect(verifyRegistrationToken(foreign, SECRET)).toBeNull();
  });

  it('rejects garbage', () => {
    expect(verifyRegistrationToken('not-a-token', SECRET)).toBeNull();
  });
});
