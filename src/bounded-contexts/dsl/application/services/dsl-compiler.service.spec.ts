/**
 * DSL Compiler Service Unit Tests
 *
 * These tests verify the DslCompilerService delegates correctly to its dependencies.
 * Full integration tests for DSL → AST transformation are in dsl-flow.integration.spec.ts.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Test boundary conditions and delegation"
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { ResumeDsl } from '@/bounded-contexts/dsl/domain/schemas/dsl';
import { ValidationException } from '@/shared-kernel/exceptions/domain.exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
import type { GenericResume } from '@/shared-kernel/schemas/sections';
import { DslMigrationService } from '../migrators';
import { DslCompilerService } from './dsl-compiler.service';
import { DslValidatorService } from './dsl-validator.service';
import { TokenResolverService } from './token-resolver.service';

function extractSectionItems(section: { data: unknown } | undefined): unknown[] {
  if (!section?.data || typeof section.data !== 'object') return [];
  const items = (section.data as { items?: unknown }).items;
  return Array.isArray(items) ? items : [];
}

function getItemContent(item: unknown): Record<string, unknown> {
  if (!item || typeof item !== 'object') return {};
  const content = (item as { content?: unknown }).content;
  return content && typeof content === 'object' ? (content as Record<string, unknown>) : {};
}

describe('DslCompilerService', () => {
  let service: DslCompilerService;

  const validDsl: ResumeDsl = {
    version: '1.0.0',
    layout: {
      type: 'single-column',
      paperSize: 'a4',
      margins: 'normal',
      pageBreakBehavior: 'auto',
    },
    tokens: {
      typography: {
        fontFamily: { heading: 'inter', body: 'inter' },
        fontSize: 'base',
        headingStyle: 'bold',
      },
      colors: {
        colors: {
          primary: '#2563eb',
          secondary: '#6b7280',
          background: '#ffffff',
          surface: '#ffffff',
          text: { primary: '#111827', secondary: '#4b5563', accent: '#2563eb' },
          border: '#e5e7eb',
          divider: '#f3f4f6',
        },
        borderRadius: 'md',
        shadows: 'none',
      },
      spacing: { density: 'comfortable', sectionGap: 'md', itemGap: 'sm', contentPadding: 'md' },
    },
    sections: [
      { id: 'work_experience_v1', visible: true, order: 1, column: 'main' },
      { id: 'skill_set_v1', visible: true, order: 2, column: 'main' },
    ],
  };

  // Real services are used because mocking the complex internal flow
  // is error-prone and the services have no external dependencies.
  beforeEach(() => {
    const validator = new DslValidatorService();
    const tokenResolver = new TokenResolverService();
    const migrationService = new DslMigrationService(stubLogger);

    service = new DslCompilerService(validator, tokenResolver, migrationService);
  });

  describe('constructor', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('validation behavior', () => {
    it('should throw ValidationException for invalid DSL', () => {
      expect(() => service.compileFromRaw(null)).toThrow(ValidationException);
    });

    it('should throw ValidationException for empty object', () => {
      expect(() => service.compileFromRaw({})).toThrow(ValidationException);
    });

    it('should throw ValidationException for invalid structure', () => {
      expect(() => service.compileFromRaw({ invalid: 'data' })).toThrow(ValidationException);
    });
  });

  describe('method signatures', () => {
    it('compileForHtml should be callable', () => {
      expect(typeof service.compileForHtml).toBe('function');
    });

    it('compileForPdf should be callable', () => {
      expect(typeof service.compileForPdf).toBe('function');
    });

    it('compile should be callable', () => {
      expect(typeof service.compile).toBe('function');
    });

    it('compileFromRaw should be callable', () => {
      expect(typeof service.compileFromRaw).toBe('function');
    });
  });

  describe('generic sections fallback', () => {
    it('should compile experience and skills from sections[] when legacy arrays are empty', () => {
      const resumeData = {
        id: 'resume-1',
        userId: 'user-1',
        title: 'Resume',
        fullName: 'John Doe',
        jobTitle: 'Backend Engineer',
        summary: null,
        phone: null,
        location: null,
        linkedin: null,
        github: null,
        website: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        style: null,
        customTheme: null,
        sections: [
          {
            id: 'section-exp-1',
            semanticKind: 'WORK_EXPERIENCE',
            sectionTypeKey: 'work_experience_v1',
            title: 'Experience',
            order: 0,
            isVisible: true,
            items: [
              {
                id: 'exp-item-1',
                order: 0,
                isVisible: true,
                content: {
                  position: 'Backend Engineer',
                  company: 'Acme',
                  startDate: '2024-01-01',
                  isCurrent: true,
                  skills: ['TypeScript'],
                },
              },
            ],
          },
          {
            id: 'section-skill-1',
            semanticKind: 'SKILL_SET',
            sectionTypeKey: 'skill_set_v1',
            title: 'Skills',
            order: 1,
            isVisible: true,
            items: [
              {
                id: 'skill-item-1',
                order: 0,
                isVisible: true,
                content: { name: 'TypeScript', level: 4, category: 'Languages' },
              },
            ],
          },
        ],
      };

      const ast = service.compileForHtml(validDsl, resumeData as unknown as GenericResume);

      const experienceSection = ast.sections.find(
        (section) => section.sectionId === 'work_experience_v1',
      );
      const skillsSection = ast.sections.find((section) => section.sectionId === 'skill_set_v1');

      // New generic format uses semanticKind instead of type
      expect(experienceSection?.data.semanticKind).toBe('WORK_EXPERIENCE');
      const experienceItems = extractSectionItems(experienceSection);
      expect(experienceItems).toHaveLength(1);
      const experienceContent = getItemContent(experienceItems[0]);
      expect(experienceContent.position).toBe('Backend Engineer');

      expect(skillsSection?.data.semanticKind).toBe('SKILL_SET');
      const skillItems = extractSectionItems(skillsSection);
      expect(skillItems).toHaveLength(1);
      const skillContent = getItemContent(skillItems[0]);
      expect(skillContent.name).toBe('TypeScript');
    });
  });

  describe('content-first section placement', () => {
    const buildResume = (
      sections: Array<Record<string, unknown>>,
    ): GenericResume =>
      ({
        id: 'resume-1',
        userId: 'user-1',
        title: 'Resume',
        fullName: 'Maria Souza',
        jobTitle: 'Software Engineer',
        summary: null,
        phone: null,
        location: null,
        linkedin: null,
        github: null,
        website: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        style: null,
        customTheme: null,
        sections,
      }) as unknown as GenericResume;

    const experienceSection = {
      id: 'section-exp-1',
      semanticKind: 'WORK_EXPERIENCE',
      sectionTypeKey: 'work_experience_v1',
      title: 'Experiência',
      order: 0,
      isVisible: true,
      titleOverride: null,
      items: [
        {
          id: 'exp-1',
          order: 0,
          isVisible: true,
          content: { position: 'Engenheira', company: 'Patch Tech' },
        },
      ],
    };
    const educationSection = {
      id: 'section-edu-1',
      semanticKind: 'EDUCATION',
      sectionTypeKey: 'education_v1',
      title: 'Formação',
      order: 1,
      isVisible: true,
      titleOverride: null,
      items: [
        {
          id: 'edu-1',
          order: 0,
          isVisible: true,
          content: { institution: 'USP', degree: 'CS' },
        },
      ],
    };

    // The real-world bug: the seeded ATS styles ship with `sections: []`, which
    // used to erase every content section from the preview/PDF. The résumé must
    // remain the source of truth for which sections render.
    it('renders résumé sections even when the style enumerates none (sections: [])', () => {
      const emptyStyleDsl: ResumeDsl = { ...validDsl, sections: [] };
      const ast = service.compileForHtml(
        emptyStyleDsl,
        buildResume([experienceSection, educationSection]),
      );

      const ids = ast.sections.map((s) => s.sectionId);
      expect(ids).toContain('work_experience_v1');
      expect(ids).toContain('education_v1');
      // Preserved in résumé order.
      expect(ids.indexOf('work_experience_v1')).toBeLessThan(ids.indexOf('education_v1'));
      expect(extractSectionItems(ast.sections.find((s) => s.sectionId === 'education_v1'))).toHaveLength(1);
    });

    it('does not duplicate a section the style already places', () => {
      const dsl: ResumeDsl = {
        ...validDsl,
        sections: [{ id: 'work_experience_v1', visible: true, order: 1, column: 'main' }],
      };
      const ast = service.compileForHtml(dsl, buildResume([experienceSection, educationSection]));

      const expCount = ast.sections.filter((s) => s.sectionId === 'work_experience_v1').length;
      expect(expCount).toBe(1);
      // Education, unlisted by the style, still appears via the fallback.
      expect(ast.sections.map((s) => s.sectionId)).toContain('education_v1');
    });

    it('respects a section the style intentionally hides (visible: false)', () => {
      const dsl: ResumeDsl = {
        ...validDsl,
        sections: [{ id: 'education_v1', visible: false, order: 1, column: 'main' }],
      };
      const ast = service.compileForHtml(dsl, buildResume([experienceSection, educationSection]));

      const ids = ast.sections.map((s) => s.sectionId);
      // Hidden by the style → not re-added as a leftover.
      expect(ids).not.toContain('education_v1');
      // Experience, unlisted, still renders.
      expect(ids).toContain('work_experience_v1');
    });
  });
});
