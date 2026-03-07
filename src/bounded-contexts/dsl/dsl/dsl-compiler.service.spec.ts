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
import { BadRequestException } from '@nestjs/common';
import type { ResumeDsl } from '@/shared-kernel';
import type { GenericResume } from '@/shared-kernel/types/generic-section.types';
import { DslCompilerService } from './dsl-compiler.service';
import { DslValidatorService } from './dsl-validator.service';
import { DslMigrationService } from './migrators';
import { TokenResolverService } from './token-resolver.service';

function extractSectionItems(section: { data: unknown } | undefined): unknown[] {
  if (!section || !section.data || typeof section.data !== 'object') return [];
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
          text: {
            primary: '#111827',
            secondary: '#4b5563',
            accent: '#2563eb',
          },
          border: '#e5e7eb',
          divider: '#f3f4f6',
        },
        borderRadius: 'md',
        shadows: 'none',
      },
      spacing: {
        density: 'comfortable',
        sectionGap: 'md',
        itemGap: 'sm',
        contentPadding: 'md',
      },
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
    const migrationService = new DslMigrationService();

    service = new DslCompilerService(validator, tokenResolver, migrationService);
  });

  describe('constructor', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('validation behavior', () => {
    it('should throw BadRequestException for invalid DSL', () => {
      expect(() => service.compileFromRaw(null)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for empty object', () => {
      expect(() => service.compileFromRaw({})).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid structure', () => {
      expect(() => service.compileFromRaw({ invalid: 'data' })).toThrow(BadRequestException);
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
        emailContact: null,
        location: null,
        linkedin: null,
        github: null,
        website: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        activeTheme: null,
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
                content: {
                  name: 'TypeScript',
                  level: 4,
                  category: 'Languages',
                },
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
});
