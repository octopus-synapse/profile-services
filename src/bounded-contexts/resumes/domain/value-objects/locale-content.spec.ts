import { describe, expect, it } from 'bun:test';
import {
  addLocale,
  type LocaleContent,
  LocaleContentSchema,
  type LocalizedSection,
  migrateFromLegacy,
  resolveForLocale,
} from './locale-content';

describe('LocaleContent', () => {
  const validContent: LocaleContent = {
    defaultLocale: 'pt-BR',
    locales: ['pt-BR', 'en'],
    sections: {
      work_experience_v1: {
        'pt-BR': {
          title: 'Experiencia Profissional',
          items: [{ company: 'Empresa X', role: 'Dev' }],
        },
        en: {
          title: 'Work Experience',
          items: [{ company: 'Company X', role: 'Dev' }],
        },
      },
    },
  };

  describe('LocaleContentSchema', () => {
    it('should accept valid content', () => {
      const result = LocaleContentSchema.safeParse(validContent);
      expect(result.success).toBe(true);
    });

    it('should accept content with no items in sections', () => {
      const content: LocaleContent = {
        defaultLocale: 'en',
        locales: ['en'],
        sections: {
          summary_v1: {
            en: { title: 'Summary' },
          },
        },
      };
      const result = LocaleContentSchema.safeParse(content);
      expect(result.success).toBe(true);
    });

    it('should reject content with empty locales array', () => {
      const invalid = { ...validContent, locales: [] };
      const result = LocaleContentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject content with unsupported locale', () => {
      const invalid = { ...validContent, defaultLocale: 'xx' };
      const result = LocaleContentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject content without defaultLocale', () => {
      const { defaultLocale: _, ...invalid } = validContent;
      const result = LocaleContentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject section without title', () => {
      const invalid = {
        ...validContent,
        sections: {
          work_experience_v1: {
            en: { items: [] },
          },
        },
      };
      const result = LocaleContentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('resolveForLocale', () => {
    it('should return the requested locale when it exists', () => {
      const result = resolveForLocale(validContent, 'en');
      expect(result.locale).toBe('en');
      expect(result.sections.work_experience_v1.title).toBe('Work Experience');
    });

    it('should fall back to defaultLocale when requested locale is missing', () => {
      const result = resolveForLocale(validContent, 'es');
      expect(result.locale).toBe('pt-BR');
      expect(result.sections.work_experience_v1.title).toBe('Experiencia Profissional');
    });

    it('should fall back to first available locale when both requested and default are missing', () => {
      const content: LocaleContent = {
        defaultLocale: 'fr',
        locales: ['de'],
        sections: {
          summary_v1: {
            de: { title: 'Zusammenfassung' },
          },
        },
      };
      const result = resolveForLocale(content, 'ja');
      expect(result.locale).toBe('fr');
      expect(result.sections.summary_v1.title).toBe('Zusammenfassung');
    });

    it('should handle content with multiple sections', () => {
      const content: LocaleContent = {
        defaultLocale: 'en',
        locales: ['en', 'pt-BR'],
        sections: {
          work_v1: {
            en: { title: 'Work' },
            'pt-BR': { title: 'Trabalho' },
          },
          education_v1: {
            en: { title: 'Education' },
            'pt-BR': { title: 'Educacao' },
          },
        },
      };
      const result = resolveForLocale(content, 'pt-BR');
      expect(result.sections.work_v1.title).toBe('Trabalho');
      expect(result.sections.education_v1.title).toBe('Educacao');
    });

    it('should handle empty sections', () => {
      const content: LocaleContent = {
        defaultLocale: 'en',
        locales: ['en'],
        sections: {},
      };
      const result = resolveForLocale(content, 'en');
      expect(result.locale).toBe('en');
      expect(Object.keys(result.sections)).toHaveLength(0);
    });
  });

  describe('migrateFromLegacy', () => {
    it('should migrate when both languages are present', () => {
      const ptBr = { name: 'Joao', summary: 'Dev' };
      const en = { name: 'John', summary: 'Dev' };

      const result = migrateFromLegacy(ptBr, en);
      expect(result.defaultLocale).toBe('pt-BR');
      expect(result.locales).toEqual(['pt-BR', 'en']);
      expect(result.sections.legacy_content_v1?.['pt-BR']?.items).toEqual([ptBr]);
      expect(result.sections.legacy_content_v1?.en?.items).toEqual([en]);
    });

    it('should migrate when only pt-BR is present', () => {
      const ptBr = { name: 'Joao' };

      const result = migrateFromLegacy(ptBr, null);
      expect(result.defaultLocale).toBe('pt-BR');
      expect(result.locales).toEqual(['pt-BR']);
      expect(result.sections.legacy_content_v1?.['pt-BR']?.items).toEqual([ptBr]);
      expect(result.sections.legacy_content_v1?.en).toBeUndefined();
    });

    it('should migrate when only en is present', () => {
      const en = { name: 'John' };

      const result = migrateFromLegacy(null, en);
      expect(result.defaultLocale).toBe('en');
      expect(result.locales).toEqual(['en']);
      expect(result.sections.legacy_content_v1?.en?.items).toEqual([en]);
    });

    it('should return empty content with default locale when neither exists', () => {
      const result = migrateFromLegacy(null, null);
      expect(result.defaultLocale).toBe('pt-BR');
      expect(result.locales).toEqual(['pt-BR']);
      expect(result.sections).toEqual({});
    });

    it('should treat undefined as missing', () => {
      const result = migrateFromLegacy(undefined, undefined);
      expect(result.defaultLocale).toBe('pt-BR');
      expect(result.locales).toEqual(['pt-BR']);
      expect(result.sections).toEqual({});
    });
  });

  describe('addLocale', () => {
    it('should add a new locale to existing content', () => {
      const newSections: Record<string, LocalizedSection> = {
        work_experience_v1: {
          title: 'Experiencia Laboral',
          items: [{ company: 'Empresa X', role: 'Dev' }],
        },
      };

      const result = addLocale(validContent, 'es', newSections);
      expect(result.locales).toContain('es');
      expect(result.sections.work_experience_v1?.es?.title).toBe('Experiencia Laboral');
    });

    it('should preserve existing locales and sections', () => {
      const newSections: Record<string, LocalizedSection> = {
        work_experience_v1: {
          title: 'Experiencia Laboral',
        },
      };

      const result = addLocale(validContent, 'es', newSections);
      expect(result.locales).toContain('pt-BR');
      expect(result.locales).toContain('en');
      expect(result.sections.work_experience_v1?.['pt-BR']?.title).toBe('Experiencia Profissional');
      expect(result.sections.work_experience_v1?.en?.title).toBe('Work Experience');
    });

    it('should not duplicate locale if it already exists', () => {
      const newSections: Record<string, LocalizedSection> = {
        work_experience_v1: {
          title: 'Updated Work Experience',
        },
      };

      const result = addLocale(validContent, 'en', newSections);
      const enCount = result.locales.filter((l) => l === 'en').length;
      expect(enCount).toBe(1);
      expect(result.sections.work_experience_v1?.en?.title).toBe('Updated Work Experience');
    });

    it('should add new sections that did not exist before', () => {
      const newSections: Record<string, LocalizedSection> = {
        education_v1: {
          title: 'Educacion',
          items: [{ school: 'Universidad' }],
        },
      };

      const result = addLocale(validContent, 'es', newSections);
      expect(result.sections.education_v1?.es?.title).toBe('Educacion');
      expect(result.sections.work_experience_v1).toBeDefined();
    });

    it('should not mutate the original content', () => {
      const original = structuredClone(validContent);
      const newSections: Record<string, LocalizedSection> = {
        work_experience_v1: {
          title: 'Experiencia Laboral',
        },
      };

      addLocale(validContent, 'es', newSections);
      expect(validContent).toEqual(original);
    });
  });

  describe('immutability', () => {
    it('should not mutate original content when resolving for locale', () => {
      const original = structuredClone(validContent);
      resolveForLocale(validContent, 'en');
      expect(validContent).toEqual(original);
    });

    it('should not mutate original content when migrating from legacy', () => {
      const ptBr = { name: 'Joao' };
      const en = { name: 'John' };
      const ptBrCopy = structuredClone(ptBr);
      const enCopy = structuredClone(en);

      migrateFromLegacy(ptBr, en);
      expect(ptBr).toEqual(ptBrCopy);
      expect(en).toEqual(enCopy);
    });
  });
});
