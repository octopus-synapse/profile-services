import { describe, expect, it } from 'bun:test';
import { DEFAULT_MIN_QUALITY_SCORE, resolveMinQualityTarget } from './min-quality-target.helper';

describe('resolveMinQualityTarget', () => {
  it('honors the declared threshold and resume param (the tailor route)', () => {
    const target = resolveMinQualityTarget({
      metadata: { min: 50, resumeParam: 'resumeId' },
      params: { resumeId: 'resume-1' },
    });
    expect(target).toEqual({ min: 50, resumeIdFromRoute: 'resume-1' });
  });

  it('defaults to 70 + primary resume when the route declares no metadata (auto-apply)', () => {
    const target = resolveMinQualityTarget({ metadata: undefined, params: {} });
    expect(target).toEqual({ min: DEFAULT_MIN_QUALITY_SCORE, resumeIdFromRoute: null });
  });

  it('falls back to the primary when the declared param is absent from the request', () => {
    const target = resolveMinQualityTarget({
      metadata: { min: 50, resumeParam: 'resumeId' },
      params: {},
    });
    expect(target).toEqual({ min: 50, resumeIdFromRoute: null });
  });

  it('ignores malformed metadata values', () => {
    const target = resolveMinQualityTarget({
      metadata: { min: 'high', resumeParam: 42 },
      params: { resumeId: 'resume-1' },
    });
    expect(target).toEqual({ min: DEFAULT_MIN_QUALITY_SCORE, resumeIdFromRoute: null });
  });
});
