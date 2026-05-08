import { describe, expect, it } from 'bun:test';
import type { Locale } from '@packages/i18n';
import {
  MissingTranslationError,
  type TranslationParams,
  TranslationPort,
} from '@/bounded-contexts/platform/i18n/domain/translation.port';
import { domainCode, localizeDomainCode, localizeDomainCodes } from '../localize-domain-code';

class FakeTranslator extends TranslationPort {
  constructor(private readonly entries: Record<string, Record<Locale, string>>) {
    super();
  }

  translate(code: string, params: TranslationParams, locale: Locale): string {
    const entry = this.entries[code];
    if (!entry) throw new MissingTranslationError(code, locale);
    return entry[locale].replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
  }

  has(code: string, _locale: Locale): boolean {
    return Object.hasOwn(this.entries, code);
  }
}

const i18n = new FakeTranslator({
  USERNAME_TOO_SHORT: {
    en: 'Username must be at least {min} characters',
    'pt-BR': 'O nome de usuário precisa ter pelo menos {min} caracteres',
  },
  USERNAME_RESERVED: {
    en: 'This username is reserved',
    'pt-BR': 'Este nome de usuário está reservado',
  },
});

describe('localizeDomainCode', () => {
  it('renders the EN template with interpolated params', () => {
    const result = localizeDomainCode(
      { code: 'USERNAME_TOO_SHORT', params: { min: 3 } },
      i18n,
      'en',
    );

    expect(result).toEqual({
      code: 'USERNAME_TOO_SHORT',
      params: { min: 3 },
      message: 'Username must be at least 3 characters',
    });
  });

  it('renders the pt-BR template for a Portuguese locale', () => {
    const result = localizeDomainCode(
      { code: 'USERNAME_TOO_SHORT', params: { min: 3 } },
      i18n,
      'pt-BR',
    );

    expect(result.message).toBe('O nome de usuário precisa ter pelo menos 3 caracteres');
  });

  it('preserves severity and other DomainCode fields', () => {
    const result = localizeDomainCode(
      { code: 'USERNAME_RESERVED', severity: 'inline' },
      i18n,
      'en',
    );

    expect(result.severity).toBe('inline');
    expect(result.message).toBe('This username is reserved');
  });

  it('throws MissingTranslationError for an unknown code', () => {
    expect(() => localizeDomainCode({ code: 'UNKNOWN_CODE' }, i18n, 'en')).toThrow(
      MissingTranslationError,
    );
  });
});

describe('localizeDomainCodes', () => {
  it('maps an array preserving order', () => {
    const result = localizeDomainCodes(
      [domainCode('USERNAME_TOO_SHORT', { min: 3 }), domainCode('USERNAME_RESERVED')],
      i18n,
      'en',
    );

    expect(result.map((r) => r.message)).toEqual([
      'Username must be at least 3 characters',
      'This username is reserved',
    ]);
  });

  it('returns an empty array for an empty input', () => {
    expect(localizeDomainCodes([], i18n, 'en')).toEqual([]);
  });
});

describe('domainCode helper', () => {
  it('builds without params', () => {
    expect(domainCode('USERNAME_RESERVED')).toEqual({ code: 'USERNAME_RESERVED' });
  });

  it('builds with params', () => {
    expect(domainCode('USERNAME_TOO_SHORT', { min: 3 })).toEqual({
      code: 'USERNAME_TOO_SHORT',
      params: { min: 3 },
    });
  });
});
