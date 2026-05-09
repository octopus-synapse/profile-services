import { describe, expect, test } from 'bun:test';
import {
  buildQueryString,
  FIXTURE_GENERIC_ID,
  FIXTURE_JOB_ID,
  FIXTURE_RESUME_ID,
  FIXTURE_SLUG,
  FIXTURE_USER_ID,
  fillPathParams,
  fillSentinelParams,
  SENTINEL_GENERIC_ID,
  SENTINEL_SLUG,
  SENTINEL_USER_ID,
} from './param-resolver';

describe('fillPathParams', () => {
  test('substitutes :userId with the user fixture UUID', () => {
    expect(fillPathParams('/v1/users/:userId')).toBe(`/v1/users/${FIXTURE_USER_ID}`);
  });

  test('substitutes :resumeId with the resume fixture UUID', () => {
    expect(fillPathParams('/v1/resumes/:resumeId')).toBe(`/v1/resumes/${FIXTURE_RESUME_ID}`);
  });

  test('substitutes :jobId with the job fixture UUID', () => {
    expect(fillPathParams('/v1/jobs/:jobId')).toBe(`/v1/jobs/${FIXTURE_JOB_ID}`);
  });

  test('falls back to the generic ID for any *Id-suffixed token', () => {
    expect(fillPathParams('/v1/foo/:sectionId')).toBe(`/v1/foo/${FIXTURE_GENERIC_ID}`);
    expect(fillPathParams('/v1/foo/:bookmarkId')).toBe(`/v1/foo/${FIXTURE_GENERIC_ID}`);
  });

  test('substitutes the bare :id token with the generic ID', () => {
    expect(fillPathParams('/v1/posts/:id')).toBe(`/v1/posts/${FIXTURE_GENERIC_ID}`);
  });

  test('substitutes any other named token with the slug fixture', () => {
    expect(fillPathParams('/v1/profiles/:username')).toBe(`/v1/profiles/${FIXTURE_SLUG}`);
    expect(fillPathParams('/v1/x/:slug')).toBe(`/v1/x/${FIXTURE_SLUG}`);
  });

  test('substitutes multiple tokens in the same path', () => {
    expect(fillPathParams('/v1/users/:userId/resumes/:resumeId')).toBe(
      `/v1/users/${FIXTURE_USER_ID}/resumes/${FIXTURE_RESUME_ID}`,
    );
  });

  test('leaves a token-free path unchanged', () => {
    expect(fillPathParams('/v1/health')).toBe('/v1/health');
  });

  test('honors per-token overrides over fixture defaults', () => {
    expect(fillPathParams('/v1/auth/oauth/available/:provider', { provider: 'github' })).toBe(
      '/v1/auth/oauth/available/github',
    );
    expect(fillPathParams('/v1/users/:userId', { userId: 'custom-user' })).toBe(
      '/v1/users/custom-user',
    );
  });

  test('falls back to the fixture when an override is undefined or null', () => {
    expect(fillPathParams('/v1/users/:userId', { userId: undefined })).toBe(
      `/v1/users/${FIXTURE_USER_ID}`,
    );
    expect(fillPathParams('/v1/users/:userId', { userId: null })).toBe(
      `/v1/users/${FIXTURE_USER_ID}`,
    );
  });
});

describe('buildQueryString', () => {
  test('returns an empty string when there is nothing to encode', () => {
    expect(buildQueryString(undefined)).toBe('');
    expect(buildQueryString(null)).toBe('');
    expect(buildQueryString({})).toBe('');
  });

  test('encodes scalar values with a leading question mark', () => {
    expect(buildQueryString({ q: 'react', limit: 10 })).toBe('?q=react&limit=10');
  });

  test('skips undefined and null members', () => {
    expect(buildQueryString({ q: 'react', period: undefined, industry: null })).toBe('?q=react');
  });

  test('repeats keys for array values', () => {
    expect(buildQueryString({ tag: ['ts', 'go'] })).toBe('?tag=ts&tag=go');
  });
});

describe('fillSentinelParams', () => {
  test('substitutes :userId with the sentinel user ID', () => {
    expect(fillSentinelParams('/v1/users/:userId')).toBe(`/v1/users/${SENTINEL_USER_ID}`);
  });

  test('substitutes :id with the sentinel generic ID', () => {
    expect(fillSentinelParams('/v1/items/:id')).toBe(`/v1/items/${SENTINEL_GENERIC_ID}`);
  });

  test('substitutes any non-Id param with the sentinel slug', () => {
    expect(fillSentinelParams('/v1/profiles/:username')).toBe(`/v1/profiles/${SENTINEL_SLUG}`);
  });
});
