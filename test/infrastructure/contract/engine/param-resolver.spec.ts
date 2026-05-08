import { describe, expect, test } from 'bun:test';
import {
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
