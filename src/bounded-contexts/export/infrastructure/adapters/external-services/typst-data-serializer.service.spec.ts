/**
 * TypstDataSerializerService Tests
 *
 * Pure transformation tests: ResumeAst → Typst JSON format.
 * Verifies px→pt conversion, font mapping, and structure.
 */

import { describe, expect, it } from 'bun:test';
import type { ResumeAst } from '@/bounded-contexts/dsl/domain/schemas/ast/resume-ast.schema';
import { TypstDataSerializerService } from './typst-data-serializer.service';

const makeAst = (overrides: Partial<ResumeAst> = {}): ResumeAst => ({
  meta: { version: '1.0.0', generatedAt: '2026-01-01T00:00:00.000Z' },
  page: {
    widthMm: 210,
    heightMm: 297,
    marginTopMm: 15,
    marginBottomMm: 15,
    marginLeftMm: 15,
    marginRightMm: 15,
    columns: [{ id: 'main', widthPercentage: 100, order: 0 }],
    columnGapMm: 4,
  },
  sections: [
    {
      sectionId: 'work_experience_v1',
      columnId: 'main',
      order: 0,
      data: {
        semanticKind: 'WORK_EXPERIENCE',
        sectionTypeKey: 'work_experience_v1',
        title: 'Experience',
        items: [
          {
            id: 'item-1',
            content: { role: 'Engineer', company: 'Acme' },
          },
        ],
      },
      styles: {
        container: {
          backgroundColor: 'transparent',
          borderColor: '#E2E8F0',
          borderWidthPx: 0,
          borderRadiusPx: 8,
          paddingPx: 16,
          marginBottomPx: 24,
        },
        title: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSizePx: 22,
          lineHeight: 1.5,
          fontWeight: 700,
          textTransform: 'none' as const,
          textDecoration: 'none' as const,
        },
        content: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSizePx: 16,
          lineHeight: 1.5,
          fontWeight: 400,
          textTransform: 'none' as const,
          textDecoration: 'none' as const,
        },
      },
    },
  ],
  globalStyles: {
    background: '#FFFFFF',
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    accent: '#3B82F6',
  },
  ...overrides,
});

describe('TypstDataSerializerService', () => {
  const service = new TypstDataSerializerService();

  describe('serialize', () => {
    it('should return valid JSON string', () => {
      const result = service.serialize(makeAst());
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should preserve page layout in mm', () => {
      const data = service.transform(makeAst());
      expect(data.page.widthMm).toBe(210);
      expect(data.page.heightMm).toBe(297);
      expect(data.page.marginTopMm).toBe(15);
    });

    it('should preserve global styles', () => {
      const data = service.transform(makeAst());
      expect(data.globalStyles.accent).toBe('#3B82F6');
      expect(data.globalStyles.textPrimary).toBe('#1E293B');
    });
  });

  describe('px to pt conversion', () => {
    it('should convert fontSizePx to fontSizePt (1px = 0.75pt)', () => {
      const data = service.transform(makeAst());
      const titleStyle = data.sections[0].styles.title;
      // 22px * 0.75 = 16.5pt
      expect(titleStyle.fontSizePt).toBe(16.5);
    });

    it('should convert container dimensions to pt', () => {
      const data = service.transform(makeAst());
      const container = data.sections[0].styles.container;
      // 8px * 0.75 = 6pt
      expect(container.borderRadiusPt).toBe(6);
      // 16px * 0.75 = 12pt
      expect(container.paddingPt).toBe(12);
      // 24px * 0.75 = 18pt
      expect(container.marginBottomPt).toBe(18);
    });

    it('should convert 0px to 0pt', () => {
      const data = service.transform(makeAst());
      expect(data.sections[0].styles.container.borderWidthPt).toBe(0);
    });
  });

  describe('font mapping', () => {
    it('should map CSS font stack to primary font name', () => {
      const data = service.transform(makeAst());
      expect(data.sections[0].styles.title.fontFamily).toBe('Inter');
      expect(data.sections[0].styles.content.fontFamily).toBe('Inter');
    });

    it('should handle unknown font stacks by extracting first font', () => {
      const ast = makeAst();
      ast.sections[0].styles.title.fontFamily = 'CustomFont, Arial, sans-serif';
      const data = service.transform(ast);
      expect(data.sections[0].styles.title.fontFamily).toBe('CustomFont');
    });
  });

  describe('section data', () => {
    it('should preserve section data as-is', () => {
      const data = service.transform(makeAst());
      const sectionData = data.sections[0].data as Record<string, unknown>;
      expect(sectionData.semanticKind).toBe('WORK_EXPERIENCE');
      expect(sectionData.title).toBe('Experience');
    });

    it('should preserve column assignment', () => {
      const data = service.transform(makeAst());
      expect(data.sections[0].columnId).toBe('main');
    });

    it('should handle text sections', () => {
      const ast = makeAst();
      ast.sections[0].data = {
        semanticKind: 'SUMMARY',
        sectionTypeKey: 'summary_v1',
        title: 'Summary',
        content: 'A brief summary.',
      };
      const data = service.transform(ast);
      const sectionData = data.sections[0].data as Record<string, unknown>;
      expect(sectionData.content).toBe('A brief summary.');
    });

    it('should handle empty sections array', () => {
      const data = service.transform(makeAst({ sections: [] }));
      expect(data.sections).toHaveLength(0);
    });
  });
});
