import { describe, expect, test } from 'bun:test';
import {
  parseLocale,
  resolveDefinitionFieldsForLocale,
  resolveTranslation,
  type TranslationsJson,
} from './locale-resolver';

describe('locale-resolver', () => {
  describe('parseLocale', () => {
    test('returns default locale for undefined', () => {
      expect(parseLocale(undefined)).toBe('en');
    });

    test('returns valid locale', () => {
      expect(parseLocale('pt-BR')).toBe('pt-BR');
      expect(parseLocale('es')).toBe('es');
      expect(parseLocale('en')).toBe('en');
    });

    test('returns default for invalid locale', () => {
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

    test('falls back to English', () => {
      const result = resolveTranslation(translations, 'es');
      expect(result.title).toBe('Work Experience');
    });

    test('returns empty for null translations', () => {
      const result = resolveTranslation(null, 'en');
      expect(result.title).toBe('');
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
              es: { label: 'Empresa', placeholder: 'ej: Google' },
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
      expect(resolved.fields[0].meta.label).toBe('Empresa');
      expect(resolved.fields[0].meta.placeholder).toBe('ex: Google');
      expect(resolved.fields[1].meta.label).toBe('Cargo');
    });

    test('resolves field labels for es', () => {
      const resolved = resolveDefinitionFieldsForLocale(definition, 'es') as typeof definition;
      expect(resolved.fields[0].meta.label).toBe('Empresa');
      expect(resolved.fields[0].meta.placeholder).toBe('ej: Google');
      // Falls back to en for role since no es translation
      expect(resolved.fields[1].meta.label).toBe('Role');
    });

    test('resolves field labels for en', () => {
      const resolved = resolveDefinitionFieldsForLocale(definition, 'en') as typeof definition;
      expect(resolved.fields[0].meta.label).toBe('Company');
      expect(resolved.fields[1].meta.label).toBe('Role');
    });

    test('preserves other meta properties', () => {
      const defWithExtra = {
        ...definition,
        fields: [
          {
            ...definition.fields[0],
            meta: {
              ...definition.fields[0].meta,
              widget: 'input',
              maxLength: 100,
            },
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
