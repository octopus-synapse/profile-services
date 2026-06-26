import { describe, expect, test } from 'bun:test';
import {
  parseLocale,
  resolveDefinitionFieldsForLocale,
  resolveTranslation,
  type TranslationsJson,
  tryResolveTranslation,
} from './locale-resolver.util';

describe('locale-resolver', () => {
  describe('parseLocale', () => {
    test('returns default locale for undefined', () => {
      expect(parseLocale(undefined)).toBe('en');
    });

    test('returns valid locale', () => {
      expect(parseLocale('pt-BR')).toBe('pt-BR');
      expect(parseLocale('en')).toBe('en');
    });

    test('returns default for invalid locale', () => {
      expect(parseLocale('es')).toBe('en');
      expect(parseLocale('fr')).toBe('en');
      expect(parseLocale('invalid')).toBe('en');
    });
  });

  describe('resolveTranslation', () => {
    const translations: TranslationsJson = {
      en: {
        title: 'Work Experience',
        description: 'Professional work',
        label: 'work',
        noDataLabel: 'No work experience',
        placeholder: 'Add work...',
        addLabel: 'Add Experience',
      },
      'pt-BR': {
        title: 'Experiência Profissional',
        description: 'Histórico de trabalho',
        label: 'trabalho',
        noDataLabel: 'Sem experiência',
        placeholder: 'Adicione trabalho...',
        addLabel: 'Adicionar Experiência',
      },
    };

    test('returns requested locale', () => {
      const result = resolveTranslation(translations, 'pt-BR');
      expect(result.title).toBe('Experiência Profissional');
    });

    test('throws when the requested locale is missing — no English fallback', () => {
      // 'pt-BR' is supported but absent: a translation gap is a BUG, not a
      // silent fall-through to English.
      const enOnly: TranslationsJson = { en: translations.en };
      expect(() => resolveTranslation(enOnly, 'pt-BR')).toThrow(
        /no translation for locale 'pt-BR'/,
      );
    });

    test('throws for null translations — no empty fallback', () => {
      expect(() => resolveTranslation(null, 'en')).toThrow(/no translations/);
    });
  });

  describe('tryResolveTranslation', () => {
    const enOnly: TranslationsJson = {
      en: {
        title: 'Work Experience',
        description: 'Professional work',
        label: 'work',
        noDataLabel: 'No work experience',
        placeholder: 'Add work...',
        addLabel: 'Add Experience',
      },
    };

    test('returns the locale entry when present', () => {
      expect(tryResolveTranslation(enOnly, 'en')?.title).toBe('Work Experience');
    });

    // The render path relies on this: a drifted/custom section type missing the
    // requested locale must return null (→ caller falls back to base title),
    // NOT throw and 500 the whole resume preview.
    test('returns null instead of throwing when the locale is missing', () => {
      expect(tryResolveTranslation(enOnly, 'pt-BR')).toBeNull();
    });

    test('returns null for null/invalid translations', () => {
      expect(tryResolveTranslation(null, 'en')).toBeNull();
      expect(tryResolveTranslation(undefined, 'en')).toBeNull();
    });
  });

  describe('resolveDefinitionFieldsForLocale', () => {
    const definition = {
      schemaVersion: 1,
      kind: 'WORK_EXPERIENCE',
      fields: [
        {
          key: 'company',
          type: 'string',
          meta: {
            label: 'Company',
            placeholder: 'e.g., Google',
            translations: {
              en: { label: 'Company', placeholder: 'e.g., Google' },
              'pt-BR': { label: 'Empresa', placeholder: 'ex: Google' },
            },
          },
        },
        {
          key: 'role',
          type: 'string',
          meta: {
            label: 'Role',
            translations: {
              en: { label: 'Role' },
              'pt-BR': { label: 'Cargo' },
            },
          },
        },
      ],
    };

    test('resolves field labels for pt-BR', () => {
      const resolved = resolveDefinitionFieldsForLocale(definition, 'pt-BR') as typeof definition;
      // Label/placeholder are flattened to field root level for frontend compatibility
      const field0 = resolved.fields[0] as (typeof resolved.fields)[0] & {
        label?: string;
        placeholder?: string;
      };
      const field1 = resolved.fields[1] as (typeof resolved.fields)[1] & { label?: string };
      expect(field0.label).toBe('Empresa');
      expect(field0.placeholder).toBe('ex: Google');
      expect(field1.label).toBe('Cargo');
    });

    test('resolves field labels for en', () => {
      const resolved = resolveDefinitionFieldsForLocale(definition, 'en') as typeof definition;
      // Label/placeholder are flattened to field root level for frontend compatibility
      const field0 = resolved.fields[0] as (typeof resolved.fields)[0] & { label?: string };
      const field1 = resolved.fields[1] as (typeof resolved.fields)[1] & { label?: string };
      expect(field0.label).toBe('Company');
      expect(field1.label).toBe('Role');
    });

    test('preserves other meta properties', () => {
      const defWithExtra = {
        ...definition,
        fields: [
          {
            ...definition.fields[0],
            meta: { ...definition.fields[0].meta, widget: 'input', maxLength: 100 },
          },
        ],
      };
      const resolved = resolveDefinitionFieldsForLocale(
        defWithExtra,
        'pt-BR',
      ) as typeof defWithExtra;
      expect(resolved.fields[0].meta.widget).toBe('input');
      expect(resolved.fields[0].meta.maxLength).toBe(100);
    });

    test('handles definition without fields', () => {
      const result = resolveDefinitionFieldsForLocale({ schemaVersion: 1 }, 'en');
      expect(result).toEqual({ schemaVersion: 1 });
    });

    test('handles null definition', () => {
      expect(resolveDefinitionFieldsForLocale(null, 'en')).toBeNull();
    });
  });
});
