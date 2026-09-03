import { describe, expect, it } from 'bun:test';
import {
  derivedState,
  envelopeFor,
  hashSource,
  otherLocale,
  resolveItemForLocale,
  type TranslationEnvelope,
} from './translation-envelope';

const env = (over: Partial<TranslationEnvelope> = {}): TranslationEnvelope => ({
  data: { role: 'Software Engineer' },
  sourceHash: hashSource({ role: 'Engenheira de Software' }),
  translatedAt: '2026-09-03T00:00:00.000Z',
  origin: 'derived',
  ...over,
});

describe('hashSource', () => {
  it('ignores key order and is stable', () => {
    expect(hashSource({ a: 1, b: ['x', 'y'] })).toBe(hashSource({ b: ['x', 'y'], a: 1 }));
  });
  it('changes when a value changes', () => {
    expect(hashSource({ role: 'A' })).not.toBe(hashSource({ role: 'B' }));
  });
});

describe('envelopeFor / derivedState', () => {
  it('reads the envelope for a locale and reports freshness against the current hash', () => {
    const translations = { en: env() };
    const e = envelopeFor(translations, 'en');
    expect(e?.origin).toBe('derived');
    expect(derivedState(e, hashSource({ role: 'Engenheira de Software' }))).toBe('current');
    expect(derivedState(e, hashSource({ role: 'Engenheira de Software Sênior' }))).toBe('stale');
    expect(derivedState(null, 'x')).toBe('missing');
  });
  it('rejects malformed entries instead of trusting them', () => {
    expect(envelopeFor({ en: { data: {} } }, 'en')).toBeNull();
    expect(envelopeFor('nope', 'en')).toBeNull();
  });
});

describe('resolveItemForLocale', () => {
  const content = { role: 'Engenheira de Software', company: 'Acme', startDate: '2022-03' };

  it('returns the canonical content untouched for the canonical locale', () => {
    const r = resolveItemForLocale(content, { en: env() }, 'pt-BR', 'pt-BR', null);
    expect(r.content).toBe(content);
    expect(r.meta).toEqual({
      contentLocale: 'pt-BR',
      origin: 'canonical',
      translationState: 'canonical',
    });
  });

  it('merges the derived prose OVER the canonical content, keeping non-prose fields', () => {
    const r = resolveItemForLocale(
      content,
      { en: env() },
      'pt-BR',
      'en',
      hashSource({ role: content.role }),
    );
    expect(r.content).toEqual({ role: 'Software Engineer', company: 'Acme', startDate: '2022-03' });
    expect(r.meta).toEqual({ contentLocale: 'en', origin: 'derived', translationState: 'current' });
  });

  it('falls back to the canonical text, flagged missing, so a reader never sees a hole', () => {
    const r = resolveItemForLocale(content, null, 'pt-BR', 'en', null);
    expect(r.content).toEqual(content);
    expect(r.meta.translationState).toBe('missing');
    expect(r.meta.contentLocale).toBe('pt-BR');
  });

  it("never calls a person's own words stale", () => {
    const r = resolveItemForLocale(
      content,
      { en: env({ origin: 'manual', sourceHash: 'old' }) },
      'pt-BR',
      'en',
      'new',
    );
    expect(r.meta).toEqual({ contentLocale: 'en', origin: 'manual', translationState: 'current' });
  });
});

describe('otherLocale', () => {
  it('is the one other locale', () => {
    expect(otherLocale('en')).toBe('pt-BR');
    expect(otherLocale('pt-BR')).toBe('en');
  });
});
