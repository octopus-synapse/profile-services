import { describe, expect, it } from 'bun:test';
import { isSupportedLocale, normalizeLocale, parseLocale } from './locale-resolver.util';

describe('normalizeLocale (ADR-003 §11)', () => {
  it('accepts the canonical tags unchanged', () => {
    expect(normalizeLocale('pt-BR')).toBe('pt-BR');
    expect(normalizeLocale('en')).toBe('en');
  });

  it('canonicalizes the spelling the Resume columns shipped with', () => {
    // The regression this whole helper exists for: `Resume.language` defaults
    // to 'pt-br', and the old parseLocale answered 'en' for it.
    expect(normalizeLocale('pt-br')).toBe('pt-BR');
  });

  it('is case- and separator-insensitive', () => {
    for (const spelling of ['PT-BR', 'pt_BR', 'PT_br', 'Pt-Br', '  pt-br  ']) {
      expect(normalizeLocale(spelling), spelling).toBe('pt-BR');
    }
    for (const spelling of ['EN', 'En', ' en ']) {
      expect(normalizeLocale(spelling), spelling).toBe('en');
    }
  });

  it('accepts the bare primary subtag the translation port speaks', () => {
    expect(normalizeLocale('pt')).toBe('pt-BR');
    expect(normalizeLocale('en')).toBe('en');
  });

  it('resolves a region we do not serve to the language we do', () => {
    expect(normalizeLocale('en-US')).toBe('en');
    expect(normalizeLocale('en-GB')).toBe('en');
    expect(normalizeLocale('pt-PT')).toBe('pt-BR');
  });

  it('returns null for absent or unrecognised input', () => {
    expect(normalizeLocale(undefined)).toBeNull();
    expect(normalizeLocale(null)).toBeNull();
    expect(normalizeLocale('')).toBeNull();
    expect(normalizeLocale('   ')).toBeNull();
    expect(normalizeLocale('klingon')).toBeNull();
    expect(normalizeLocale('fr')).toBeNull();
    expect(normalizeLocale('fr-FR')).toBeNull();
  });
});

describe('parseLocale', () => {
  it('canonicalizes rather than falling through to the default', () => {
    expect(parseLocale('pt-br')).toBe('pt-BR');
    expect(parseLocale('pt')).toBe('pt-BR');
    expect(parseLocale('PT_BR')).toBe('pt-BR');
  });

  it('defaults when the input is absent or unrecognised', () => {
    expect(parseLocale(undefined)).toBe('en');
    expect(parseLocale('')).toBe('en');
    expect(parseLocale('klingon')).toBe('en');
  });
});

describe('isSupportedLocale', () => {
  it('stays strict — it answers "is this already canonical?"', () => {
    expect(isSupportedLocale('pt-BR')).toBe(true);
    expect(isSupportedLocale('en')).toBe(true);
    expect(isSupportedLocale('pt-br')).toBe(false);
    expect(isSupportedLocale('pt')).toBe(false);
  });
});
