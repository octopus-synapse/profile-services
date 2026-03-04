/**
 * DSL Compiler Service Unit Tests
 *
 * These tests verify the DslCompilerService delegates correctly to its dependencies.
 * Full integration tests for DSL → AST transformation are in dsl-flow.integration.spec.ts.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Test boundary conditions and delegation"
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { DslCompilerService } from './dsl-compiler.service';
import { DslValidatorService } from './dsl-validator.service';
import { TokenResolverService } from './token-resolver.service';
import { DslMigrationService } from './migrators';
import { BadRequestException } from '@nestjs/common';
import type { ResumeDsl } from '@/shared-kernel';

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
      { id: 'experience', visible: true, order: 1, column: 'main' },
      { id: 'skills', visible: true, order: 2, column: 'main' },
    ],
  };

  // Real services are used because mocking the complex internal flow
  // is error-prone and the services have no external dependencies.
  beforeEach(() => {
    const validator = new DslValidatorService();
    const tokenResolver = new TokenResolverService();
    const migrationService = new DslMigrationService();

    service = new DslCompilerService(
      validator,
      tokenResolver,
      migrationService,
    );
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
      expect(() => service.compileFromRaw({ invalid: 'data' })).toThrow(
        BadRequestException,
      );
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
        summary: null,
        activeTheme: null,
        customTheme: null,
        sections: [
          {
            id: 'section-exp-1',
            semanticKind: 'WORK_EXPERIENCE',
            sectionTypeKey: 'experience',
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
            sectionTypeKey: 'skills',
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
      } as any;

      const ast = service.compileForHtml(validDsl, resumeData);

      const experienceSection = ast.sections.find(
        (section) => section.sectionId === 'experience',
      );
      const skillsSection = ast.sections.find(
        (section) => section.sectionId === 'skills',
      );

      // New generic format uses semanticKind instead of type
      expect(experienceSection?.data.semanticKind).toBe('WORK_EXPERIENCE');
      expect((experienceSection?.data as any).items).toHaveLength(1);
      expect((experienceSection?.data as any).items[0].content.position).toBe(
        'Backend Engineer',
      );

      expect(skillsSection?.data.semanticKind).toBe('SKILL_SET');
      expect((skillsSection?.data as any).items).toHaveLength(1);
      expect((skillsSection?.data as any).items[0].content.name).toBe(
        'TypeScript',
      );
    });
  });
});
