import { describe, expect, it } from 'bun:test';
import { MissingTranslationError } from '../domain/translation.port';
import { I18nService } from './i18n.service';

describe('I18nService', () => {
  const i18n = new I18nService();

  it('loads the en catalog and resolves a known static code', () => {
    const msg = i18n.translate('ACCOUNT_DEACTIVATED', {}, 'en');
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('loads the pt-BR catalog and resolves a known static code', () => {
    const msg = i18n.translate('ACCOUNT_DEACTIVATED', {}, 'pt-BR');
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
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

  it('interpolates {param} placeholders using supplied params', () => {
    // We can't rely on a real code carrying a placeholder yet, so verify the
    // interpolation mechanism via rawTemplate-backed instance behaviour.
    // biome-ignore lint/suspicious/noExplicitAny: test-only private access
    const anyService = i18n as any;
    const result = anyService.interpolate(
      'Hello {name}, you owe {cents} cents',
      { name: 'World', cents: 42 },
      'TEST',
      'en',
    );
    expect(result).toBe('Hello World, you owe 42 cents');
  });

  it('leaves unknown placeholders intact and logs a warning instead of silently dropping', () => {
    // biome-ignore lint/suspicious/noExplicitAny: test-only private access
    const anyService = i18n as any;
    const result = anyService.interpolate('Hi {unknown}', {}, 'TEST', 'en');
    expect(result).toBe('Hi {unknown}');
  });
});
