import { describe, expect, it } from 'bun:test';
import { hashSource, resolveResumeProse, resolveStoredItem } from './translation-envelope';

describe('resolveStoredItem', () => {
  const content = { role: 'Engenheiro', company: 'ACME', startDate: '2020-01' };
  it('returns the canonical content for the canonical locale', () => {
    const { content: out, meta } = resolveStoredItem(content, null, 'pt-BR', 'pt-BR');
    expect(out).toBe(content);
    expect(meta.origin).toBe('canonical');
  });
  it('merges a current envelope over the canonical content', () => {
    const translations = {
      en: {
        data: { role: 'Engineer' },
        sourceHash: hashSource({ role: 'Engenheiro' }),
        translatedAt: '2026-01-01T00:00:00.000Z',
        origin: 'derived',
      },
    };
    const { content: out, meta } = resolveStoredItem(content, translations, 'pt-BR', 'en');
    expect(out).toEqual({ role: 'Engineer', company: 'ACME', startDate: '2020-01' });
    expect(meta).toEqual({ contentLocale: 'en', origin: 'derived', translationState: 'current' });
  });
  it('flags a derived envelope whose source moved on as stale', () => {
    const translations = {
      en: { data: { role: 'Engineer' }, sourceHash: 'old', translatedAt: 'x', origin: 'derived' },
    };
    expect(resolveStoredItem(content, translations, 'pt-BR', 'en').meta.translationState).toBe(
      'stale',
    );
  });
  it('falls back to the canonical text, flagged missing, without an envelope', () => {
    const { content: out, meta } = resolveStoredItem(content, null, 'pt-BR', 'en');
    expect(out).toBe(content);
    expect(meta.translationState).toBe('missing');
    expect(meta.contentLocale).toBe('pt-BR');
  });
});

describe('resolveResumeProse', () => {
  const prose = { summary: 'Resumo', headline: 'Título', jobTitle: 'Dev' };
  it('keeps the columns for the canonical locale', () => {
    expect(resolveResumeProse(prose, null, 'pt-BR', 'pt-BR')).toBe(prose);
  });
  it('merges the envelope field by field, keeping canonical text for holes', () => {
    const translations = {
      en: {
        data: { summary: 'Summary', headline: '' },
        sourceHash: 'h',
        translatedAt: 'x',
        origin: 'derived',
      },
    };
    expect(resolveResumeProse(prose, translations, 'pt-BR', 'en')).toEqual({
      summary: 'Summary',
      headline: 'Título',
      jobTitle: 'Dev',
    });
  });
});
