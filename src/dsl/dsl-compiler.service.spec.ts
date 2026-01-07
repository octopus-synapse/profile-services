/**
 * DSL Compiler Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { DslCompilerService } from './dsl-compiler.service';
import { DslValidatorService } from './dsl-validator.service';
import { TokenResolverService } from './token-resolver.service';
import type { ResumeDsl } from '@octopus-synapse/profile-contracts';

describe('DslCompilerService', () => {
  let service: DslCompilerService;

  const validDsl: ResumeDsl = {
    version: '1.0.0',
    layout: {
      type: 'two-column',
      paperSize: 'a4',
      margins: 'normal',
      columnDistribution: '70-30',
      pageBreakBehavior: 'section-aware',
      showPageNumbers: true,
      pageNumberPosition: 'bottom-center',
    },
    tokens: {
      typography: {
        fontFamily: { heading: 'inter', body: 'inter' },
        fontSize: 'base',
        headingStyle: 'accent-border',
      },
      colors: {
        colors: {
          primary: '#3B82F6',
          secondary: '#64748B',
          background: '#FFFFFF',
          surface: '#F8FAFC',
          text: { primary: '#1E293B', secondary: '#64748B', accent: '#3B82F6' },
          border: '#E2E8F0',
          divider: '#F1F5F9',
        },
        borderRadius: 'lg',
        shadows: 'subtle',
      },
      spacing: {
        density: 'comfortable',
        sectionGap: 'lg',
        itemGap: 'md',
        contentPadding: 'md',
      },
    },
    sections: [
      { id: 'header', visible: true, order: 0, column: 'full-width' },
      { id: 'summary', visible: true, order: 1, column: 'main' },
      { id: 'experiences', visible: true, order: 2, column: 'main' },
      { id: 'skills', visible: true, order: 3, column: 'sidebar' },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DslCompilerService,
        DslValidatorService,
        TokenResolverService,
      ],
    }).compile();

    service = module.get<DslCompilerService>(DslCompilerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('compileForHtml', () => {
    it('should compile valid DSL to AST', () => {
      const ast = service.compileForHtml(validDsl);

      expect(ast).toBeDefined();
      expect(ast.meta.version).toBe('1.0.0');
      expect(ast.meta.generatedAt).toBeDefined();
    });

    it('should resolve page dimensions for A4', () => {
      const ast = service.compileForHtml(validDsl);

      expect(ast.page.widthMm).toBe(210);
      expect(ast.page.heightMm).toBe(297);
    });

    it('should create two columns for two-column layout', () => {
      const ast = service.compileForHtml(validDsl);

      expect(ast.page.columns).toHaveLength(2);
      expect(ast.page.columns[0].id).toBe('main');
      expect(ast.page.columns[0].widthPercentage).toBe(70);
      expect(ast.page.columns[1].id).toBe('sidebar');
      expect(ast.page.columns[1].widthPercentage).toBe(30);
    });

    it('should place sections in correct columns', () => {
      const ast = service.compileForHtml(validDsl);

      const summary = ast.sections.find((s) => s.sectionId === 'summary');
      const skills = ast.sections.find((s) => s.sectionId === 'skills');

      expect(summary?.columnId).toBe('main');
      expect(skills?.columnId).toBe('sidebar');
    });

    it('should resolve typography tokens to concrete values', () => {
      const ast = service.compileForHtml(validDsl);

      const section = ast.sections[0];
      expect(section.styles.title.fontFamily).toContain('Inter');
      expect(section.styles.title.fontSizePx).toBe(22); // 'base' heading size
      expect(section.styles.content.fontSizePx).toBe(16); // 'base' body size
    });

    it('should resolve spacing tokens with density factor', () => {
      const ast = service.compileForHtml(validDsl);

      const section = ast.sections[0];
      // 'comfortable' density = factor 1, 'lg' sectionGap = 24px
      expect(section.styles.container.marginBottomPx).toBe(24);
    });

    it('should filter out hidden sections', () => {
      const dslWithHidden: ResumeDsl = {
        ...validDsl,
        sections: [
          ...validDsl.sections,
          { id: 'hidden-section', visible: false, order: 99, column: 'main' },
        ],
      };

      const ast = service.compileForHtml(dslWithHidden);

      const hidden = ast.sections.find((s) => s.sectionId === 'hidden-section');
      expect(hidden).toBeUndefined();
    });

    it('should sort sections by order', () => {
      const dslUnordered: ResumeDsl = {
        ...validDsl,
        sections: [
          { id: 'third', visible: true, order: 3, column: 'main' },
          { id: 'first', visible: true, order: 1, column: 'main' },
          { id: 'second', visible: true, order: 2, column: 'main' },
        ],
      };

      const ast = service.compileForHtml(dslUnordered);

      expect(ast.sections[0].sectionId).toBe('first');
      expect(ast.sections[1].sectionId).toBe('second');
      expect(ast.sections[2].sectionId).toBe('third');
    });
  });

  describe('single-column layout', () => {
    it('should create single column', () => {
      const singleColumnDsl: ResumeDsl = {
        ...validDsl,
        layout: { ...validDsl.layout, type: 'single-column' },
      };

      const ast = service.compileForHtml(singleColumnDsl);

      expect(ast.page.columns).toHaveLength(1);
      expect(ast.page.columns[0].widthPercentage).toBe(100);
    });
  });

  describe('compact density', () => {
    it('should apply density factor to spacing', () => {
      const compactDsl: ResumeDsl = {
        ...validDsl,
        tokens: {
          ...validDsl.tokens,
          spacing: { ...validDsl.tokens.spacing, density: 'compact' },
        },
      };

      const ast = service.compileForHtml(compactDsl);

      // 'compact' density = factor 0.75, 'lg' sectionGap = 24px * 0.75 = 18px
      const section = ast.sections[0];
      expect(section.styles.container.marginBottomPx).toBe(18);
    });
  });

  describe('heading styles', () => {
    it('should resolve underline heading style', () => {
      const underlineDsl: ResumeDsl = {
        ...validDsl,
        tokens: {
          ...validDsl.tokens,
          typography: {
            ...validDsl.tokens.typography,
            headingStyle: 'underline',
          },
        },
      };

      const ast = service.compileForHtml(underlineDsl);
      // Heading style is resolved in token resolver, affects AST indirectly
      expect(ast.sections[0].styles.title.fontWeight).toBe(600);
    });

    it('should resolve uppercase heading style', () => {
      const uppercaseDsl: ResumeDsl = {
        ...validDsl,
        tokens: {
          ...validDsl.tokens,
          typography: {
            ...validDsl.tokens.typography,
            headingStyle: 'uppercase',
          },
        },
      };

      const ast = service.compileForHtml(uppercaseDsl);
      expect(ast.sections[0].styles.title.textTransform).toBe('uppercase');
    });
  });
});
