import { describe, expect, it } from 'bun:test';
import {
  InternalAuthNotConfiguredException,
  InternalTokenInvalidException,
  InternalTokenMissingException,
} from '../domain/exceptions';
import { assertInternalAuth } from './internal-auth.guard';

describe('assertInternalAuth', () => {
  it('throws InternalAuthNotConfiguredException when the server has no token configured', () => {
    expect(() =>
      assertInternalAuth({ headerValue: 'anything', configuredToken: undefined }),
    ).toThrow(InternalAuthNotConfiguredException);
  });

  it('throws InternalTokenMissingException when the request omits the header', () => {
    expect(() =>
      assertInternalAuth({ headerValue: undefined, configuredToken: 'expected-secret' }),
    ).toThrow(InternalTokenMissingException);
  });

  it('throws InternalTokenInvalidException when the header value does not match', () => {
    expect(() =>
      assertInternalAuth({ headerValue: 'wrong', configuredToken: 'expected-secret' }),
    ).toThrow(InternalTokenInvalidException);
  });

  it('throws InternalTokenInvalidException for length mismatches', () => {
    expect(() =>
      assertInternalAuth({ headerValue: 'short', configuredToken: 'longer-token-value' }),
    ).toThrow(InternalTokenInvalidException);
  });

  it('passes silently when token matches', () => {
    expect(() =>
      assertInternalAuth({ headerValue: 'correct-secret', configuredToken: 'correct-secret' }),
    ).not.toThrow();
  });
});
