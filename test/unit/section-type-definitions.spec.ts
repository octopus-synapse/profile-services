import { describe, it, expect } from 'bun:test';
import { SectionDefinitionSchema } from '../../src/shared-kernel/dtos/semantic-sections.dto';
import { sectionTypes } from '../../prisma/seeds/section-type.seed';

describe('SectionType Definitions Validation', () => {
  describe('Schema Compliance', () => {
    it('should have at least 15 section types defined', () => {
      expect(sectionTypes.length).toBeGreaterThanOrEqual(15);
    });

    it('all definitions should validate against SectionDefinitionSchema', () => {
      const errors: string[] = [];

      for (const sectionType of sectionTypes) {
        const result = SectionDefinitionSchema.safeParse(
          sectionType.definition,
        );
        if (!result.success) {
          errors.push(`${sectionType.key}: ${result.error.message}`);
        }
      }

      expect(errors).toEqual([]);
    });
  });

  describe('Required Fields', () => {
    it('all section types should have sectionDetection in ATS config', () => {
      const missing: string[] = [];

      for (const st of sectionTypes) {
        const def = st.definition as { ats?: { sectionDetection?: unknown } };
        if (!def.ats?.sectionDetection) {
          missing.push(st.key);
        }
      }

      expect(missing).toEqual([]);
    });

    it('all section types should have at least one field with semanticRole', () => {
      const missing: string[] = [];

      for (const st of sectionTypes) {
        const def = st.definition as {
          fields?: Array<{ semanticRole?: string }>;
        };
        const hasSemanticRole = def.fields?.some((f) => f.semanticRole);
        if (!hasSemanticRole) {
          missing.push(st.key);
        }
      }

      expect(missing).toEqual([]);
    });

    it('all section types should have export.dsl config', () => {
      const missing: string[] = [];

      for (const st of sectionTypes) {
        const def = st.definition as { export?: { dsl?: unknown } };
        if (!def.export?.dsl) {
          missing.push(st.key);
        }
      }

      expect(missing).toEqual([]);
    });
  });

  describe('ATS Config Completeness', () => {
    it('all section types should have scoring with baseScore', () => {
      const missing: string[] = [];

      for (const st of sectionTypes) {
        const def = st.definition as {
          ats?: { scoring?: { baseScore?: number } };
        };
        if (typeof def.ats?.scoring?.baseScore !== 'number') {
          missing.push(st.key);
        }
      }

      expect(missing).toEqual([]);
    });

    it('all section types should have recommendedPosition', () => {
      const missing: string[] = [];

      for (const st of sectionTypes) {
        const def = st.definition as { ats?: { recommendedPosition?: number } };
        if (typeof def.ats?.recommendedPosition !== 'number') {
          missing.push(st.key);
        }
      }

      expect(missing).toEqual([]);
    });

    it('sectionDetection should have keywords array', () => {
      const missing: string[] = [];

      for (const st of sectionTypes) {
        const def = st.definition as {
          ats?: { sectionDetection?: { keywords?: string[] } };
        };
        if (!Array.isArray(def.ats?.sectionDetection?.keywords)) {
          missing.push(st.key);
        }
      }

      expect(missing).toEqual([]);
    });
  });

  describe('Semantic Role Consistency', () => {
    it('should use consistent semantic roles across section types', () => {
      const rolesUsed = new Set<string>();

      for (const st of sectionTypes) {
        const def = st.definition as {
          fields?: Array<{ semanticRole?: string }>;
        };
        for (const field of def.fields || []) {
          if (field.semanticRole) {
            rolesUsed.add(field.semanticRole);
          }
        }
      }

      // Common roles that should exist
      const expectedRoles = [
        'TITLE',
        'ORGANIZATION',
        'DESCRIPTION',
        'START_DATE',
        'END_DATE',
        'URL',
      ];

      for (const role of expectedRoles) {
        expect(rolesUsed.has(role)).toBe(true);
      }
    });
  });

  describe('Kind Uniqueness', () => {
    it('each section type should have unique kind', () => {
      const kinds = new Map<string, string[]>();

      for (const st of sectionTypes) {
        const def = st.definition as { kind?: string };
        if (def.kind) {
          const existing = kinds.get(def.kind) || [];
          existing.push(st.key);
          kinds.set(def.kind, existing);
        }
      }

      const duplicates = Array.from(kinds.entries())
        .filter(([, keys]) => keys.length > 1)
        .map(([kind, keys]) => `${kind}: [${keys.join(', ')}]`);

      expect(duplicates).toEqual([]);
    });
  });
});
