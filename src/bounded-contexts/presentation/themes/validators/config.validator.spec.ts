import { describe, expect, it } from 'bun:test';
import { ValidationException } from '@/shared-kernel/exceptions/domain.exceptions';
import {
  validateItemOverrides,
  validateLayoutConfig,
  validateSectionsConfig,
} from './config.validator';

/**
 * Config Validator Tests
 *
 * Tests theme configuration validation using semantic section keys.
 * Legacy section IDs (experiences, education, skills, etc.) have been REMOVED.
 */
describe('ConfigValidator', () => {
  describe('validateLayoutConfig', () => {
    it('should accept valid layout types', () => {
      expect(() => validateLayoutConfig({ type: 'single-column' })).not.toThrow();
      expect(() => validateLayoutConfig({ type: 'two-column' })).not.toThrow();
      expect(() => validateLayoutConfig({ type: 'sidebar-left' })).not.toThrow();
      expect(() => validateLayoutConfig({ type: 'sidebar-right' })).not.toThrow();
      expect(() => validateLayoutConfig({ type: 'magazine' })).not.toThrow();
      expect(() => validateLayoutConfig({ type: 'compact' })).not.toThrow();
    });

    it('should throw for invalid layout type', () => {
      expect(() => validateLayoutConfig({ type: 'invalid' })).toThrow(ValidationException);
    });

    it('should throw for non-object layout', () => {
      expect(() => validateLayoutConfig(null)).toThrow(ValidationException);
      expect(() => validateLayoutConfig('string')).toThrow(ValidationException);
    });
  });

  describe('validateSectionsConfig', () => {
    describe('semantic section keys', () => {
      it('should accept semantic section type keys', () => {
        const semanticSections = [
          { id: 'work_experience_v1', visible: true, order: 1 },
          { id: 'education_v1', visible: true, order: 2 },
          { id: 'skill_set_v1', visible: true, order: 3 },
          { id: 'language_v1', visible: true, order: 4 },
          { id: 'certification_v1', visible: true, order: 5 },
          { id: 'project_v1', visible: true, order: 6 },
        ];

        expect(() => validateSectionsConfig(semanticSections)).not.toThrow();
      });

      it('should accept all core section types', () => {
        const coreSections = [
          { id: 'header_v1', visible: true, order: 0 },
          { id: 'summary_v1', visible: true, order: 1 },
          { id: 'work_experience_v1', visible: true, order: 2 },
          { id: 'education_v1', visible: true, order: 3 },
          { id: 'skill_set_v1', visible: true, order: 4 },
        ];

        expect(() => validateSectionsConfig(coreSections)).not.toThrow();
      });

      it('should accept extended section types', () => {
        const extendedSections = [
          { id: 'award_v1', visible: true, order: 1 },
          { id: 'publication_v1', visible: true, order: 2 },
          { id: 'talk_v1', visible: true, order: 3 },
          { id: 'open_source_v1', visible: true, order: 4 },
          { id: 'hackathon_v1', visible: true, order: 5 },
          { id: 'interest_v1', visible: true, order: 6 },
        ];

        expect(() => validateSectionsConfig(extendedSections)).not.toThrow();
      });

      it('should accept custom section type keys', () => {
        const customSections = [
          { id: 'custom_section_123', visible: true, order: 1 },
          { id: 'user_created_456', visible: true, order: 2 },
          { id: 'my_custom_portfolio', visible: true, order: 3 },
        ];

        expect(() => validateSectionsConfig(customSections)).not.toThrow();
      });
    });

    describe('legacy section IDs (REMOVED)', () => {
      it('should REJECT legacy section IDs', () => {
        // Legacy IDs like "experiences", "education", "skills" are no longer valid
        // Use semantic keys like "work_experience_v1", "education_v1", "skill_set_v1"
        const legacySections = [{ id: 'experiences', visible: true, order: 1 }];

        expect(() => validateSectionsConfig(legacySections)).toThrow(ValidationException);
      });

      it('should REJECT all old legacy IDs', () => {
        const legacyIds = [
          'experiences',
          'education',
          'skills',
          'languages',
          'certifications',
          'projects',
          'header',
          'summary',
        ];

        for (const legacyId of legacyIds) {
          expect(() => validateSectionsConfig([{ id: legacyId, visible: true, order: 1 }])).toThrow(
            ValidationException,
          );
        }
      });
    });

    it('should throw for non-array sections', () => {
      expect(() => validateSectionsConfig(null)).toThrow(ValidationException);
      expect(() => validateSectionsConfig({})).toThrow(ValidationException);
    });

    it('should throw for section without visible property', () => {
      const sections = [{ id: 'header_v1', order: 1 }];
      expect(() => validateSectionsConfig(sections)).toThrow(ValidationException);
    });

    it('should throw for section without order property', () => {
      const sections = [{ id: 'header_v1', visible: true }];
      expect(() => validateSectionsConfig(sections)).toThrow(ValidationException);
    });

    it('should throw for invalid section ID format', () => {
      // Section IDs must be snake_case
      const invalidSections = [{ id: 'InvalidCamelCase', visible: true, order: 1 }];
      expect(() => validateSectionsConfig(invalidSections)).toThrow(ValidationException);
    });
  });

  describe('validateItemOverrides', () => {
    it('should accept undefined overrides', () => {
      expect(() => validateItemOverrides(undefined)).not.toThrow();
    });

    it('should accept semantic section keys in overrides', () => {
      const overrides = {
        work_experience_v1: [{ id: 'exp-1', style: { highlight: true } }],
        skill_set_v1: [{ id: 'skill-1', style: { bold: true } }],
      };

      expect(() => validateItemOverrides(overrides)).not.toThrow();
    });

    it('should accept custom section keys in overrides', () => {
      const overrides = {
        custom_portfolio: [{ id: 'item-1', style: { featured: true } }],
      };

      expect(() => validateItemOverrides(overrides)).not.toThrow();
    });

    it('should REJECT legacy section IDs in overrides', () => {
      const overrides = {
        experiences: [{ id: 'exp-1', style: { highlight: true } }],
      };

      expect(() => validateItemOverrides(overrides)).toThrow(ValidationException);
    });

    it('should throw for non-object overrides', () => {
      expect(() => validateItemOverrides('invalid')).toThrow(ValidationException);
    });

    it('should throw for non-array override items', () => {
      const overrides = { header_v1: 'not-an-array' };
      expect(() => validateItemOverrides(overrides)).toThrow(ValidationException);
    });
  });
});
