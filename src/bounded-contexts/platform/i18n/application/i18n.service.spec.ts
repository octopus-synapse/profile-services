import { describe, expect, it } from 'bun:test';
import { MissingTranslationError } from '../domain/translation.port';
import { I18nService } from './i18n.service';

describe('I18nService', () => {
  const i18n = new I18nService();

  it('resolves a known static code in en', () => {
    const msg = i18n.translate('ACCOUNT_DEACTIVATED', {}, 'en');
    expect(msg).toBe('Account is deactivated');
  });

  it('resolves a known static code in pt-BR', () => {
    const msg = i18n.translate('ACCOUNT_DEACTIVATED', {}, 'pt-BR');
    expect(msg).toBe('A conta está desativada');
  });

  it('throws MissingTranslationError for an unknown code', () => {
    expect(() => i18n.translate('DEFINITELY_NOT_A_REAL_CODE_XYZ', {}, 'en')).toThrow(
      MissingTranslationError,
    );
  });

  it('reports has() correctly for known and unknown codes', () => {
    expect(i18n.has('ACCOUNT_DEACTIVATED', 'en')).toBe(true);
    expect(i18n.has('DEFINITELY_NOT_A_REAL_CODE_XYZ', 'en')).toBe(false);
  });

  it('interpolates {param} placeholders from supplied params', () => {
    // ENTITY_NOT_FOUND has `{entityType}` in both locales.
    const msg = i18n.translate('ENTITY_NOT_FOUND', { entityType: 'User' }, 'en');
    expect(msg).toBe('User not found');
    const msgPt = i18n.translate('ENTITY_NOT_FOUND', { entityType: 'Usuário' }, 'pt-BR');
    expect(msgPt).toBe('Usuário não encontrado');
  });

  it('leaves unknown placeholders intact instead of silently dropping', () => {
    // biome-ignore lint/suspicious/noExplicitAny: test-only private access
    const anyService = i18n as any;
    const result = anyService.interpolate('Hi {unknown}', {}, 'TEST', 'en');
    expect(result).toBe('Hi {unknown}');
  });
});
