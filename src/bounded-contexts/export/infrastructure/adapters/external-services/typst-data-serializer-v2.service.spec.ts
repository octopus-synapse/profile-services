/**
 * TypstDataSerializerV2Service Tests
 *
 * Verifies V2 serialization: px-to-pt conversion, font mapping,
 * theme token passthrough, and backward compatibility without theme.
 */

import { describe, expect, it } from 'bun:test';
import type {
  ResumeAstV2Input,
  ResumeAstV2Theme,
  TypstResumeDataV2,
} from './typst-data-serializer-v2.service';
import { TypstDataSerializerV2Service } from './typst-data-serializer-v2.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeTheme = (
  overrides: Partial<ResumeAstV2Theme> = {},
): ResumeAstV2Theme => ({
  page: {
    width: 210,
    height: 297,
    marginTop: 15,
    marginBottom: 15,
    marginLeft: 15,
    marginRight: 15,
    background: '#FFFFFF',
  },
  header: {
    name: {
      fontSize: 24,
      fontWeight: 700,
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#1E293B',
      tracking: 0.5,
      alignment: 'center',
    },
    jobTitle: {
      fontSize: 14,
      fontWeight: 400,
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#64748B',
      tracking: 0,
    },
    contact: {
      fontSize: 10,
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#64748B',
      separator: '|',
      separatorColor: '#CBD5E1',
    },
    divider: {
      show: true,
      weight: 1,
      color: '#E2E8F0',
      marginTop: 8,
      marginBottom: 12,
    },
  },
  sectionHeader: { fontSize: 13, fontWeight: 700, color: '#1E293B' },
  entry: { titleFontSize: 11, subtitleFontSize: 10 },
  bullets: { indent: 12, markerColor: '#64748B' },
  technologies: { fontSize: 9, badgeBg: '#F1F5F9' },
  skillsList: { columns: 2, fontSize: 10 },
  textSection: { fontSize: 11, lineHeight: 1.4 },
  global: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 11,
    color: '#1E293B',
    lineHeight: 1.3,
    justify: true,
  },
  ...overrides,
});

const makeAst = (
  overrides: Partial<ResumeAstV2Input> = {},
): ResumeAstV2Input => ({
  meta: { version: '2.0.0', generatedAt: '2026-01-01T00:00:00.000Z' },
  header: {
    fullName: 'Jane Doe',
    jobTitle: 'Software Engineer',
    phone: '+1 555-0100',
    email: 'jane@example.com',
    location: 'New York, NY',
    linkedin: 'linkedin.com/in/janedoe',
    github: 'github.com/janedoe',
    website: 'janedoe.dev',
  },
  page: {
    widthMm: 210,
    heightMm: 297,
    marginTopMm: 15,
    marginBottomMm: 15,
    marginLeftMm: 15,
    marginRightMm: 15,
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
          { id: 'item-1', content: { role: 'Engineer', company: 'Acme' } },
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
          textTransform: 'none',
          textDecoration: 'none',
        },
        content: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSizePx: 16,
          lineHeight: 1.5,
          fontWeight: 400,
          textTransform: 'none',
          textDecoration: 'none',
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TypstDataSerializerV2Service', () => {
  const service = new TypstDataSerializerV2Service();

  describe('serialize', () => {
    it('should return valid JSON string', () => {
      const result = service.serialize(makeAst({ theme: makeTheme() }));
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should include theme key when theme is present', () => {
      const result = service.serialize(makeAst({ theme: makeTheme() }));
      const parsed = JSON.parse(result) as TypstResumeDataV2;
      expect(parsed.theme).toBeDefined();
      expect(parsed.theme!.page.width).toBe(210);
    });

    it('should not include theme key when theme is absent', () => {
      const result = service.serialize(makeAst());
      const parsed = JSON.parse(result) as TypstResumeDataV2;
      expect(parsed.theme).toBeUndefined();
    });
  });

  describe('px to pt conversion', () => {
    it('should convert fontSizePx to fontSizePt (1px = 0.75pt)', () => {
      const data = service.transform(makeAst());
      const titleStyle = data.sections[0].styles.title;
      // 22px * 0.75 = 16.5pt
      expect(titleStyle.fontSizePt).toBe(16.5);
    });

    it('should convert 16px to 12pt', () => {
      const data = service.transform(makeAst());
      const contentStyle = data.sections[0].styles.content;
      // 16px * 0.75 = 12pt
      expect(contentStyle.fontSizePt).toBe(12);
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

  describe('font name extraction', () => {
    it('should extract primary font from CSS stack', () => {
      const data = service.transform(makeAst());
      expect(data.sections[0].styles.title.fontFamily).toBe('Inter');
      expect(data.sections[0].styles.content.fontFamily).toBe('Inter');
    });

    it('should extract "Inter" from "Inter, sans-serif"', () => {
      const ast = makeAst();
      ast.sections[0].styles.title.fontFamily = 'Inter, sans-serif';
      const data = service.transform(ast);
      expect(data.sections[0].styles.title.fontFamily).toBe('Inter');
    });

    it('should handle unknown font stacks by extracting first font', () => {
      const ast = makeAst();
      ast.sections[0].styles.title.fontFamily =
        'CustomFont, Arial, sans-serif';
      const data = service.transform(ast);
      expect(data.sections[0].styles.title.fontFamily).toBe('CustomFont');
    });

    it('should handle single font name without comma', () => {
      const ast = makeAst();
      ast.sections[0].styles.title.fontFamily = 'Roboto';
      const data = service.transform(ast);
      expect(data.sections[0].styles.title.fontFamily).toBe('Roboto');
    });

    it('should sanitize font families in theme tokens', () => {
      const theme = makeTheme();
      const data = service.transform(makeAst({ theme }));
      expect(data.theme!.header.name.fontFamily).toBe('Inter');
      expect(data.theme!.header.jobTitle.fontFamily).toBe('Inter');
      expect(data.theme!.header.contact.fontFamily).toBe('Inter');
      expect(data.theme!.global.fontFamily).toBe('Inter');
    });

    it('should sanitize different font families in theme', () => {
      const theme = makeTheme({
        global: {
          fontFamily: 'Merriweather, Georgia, serif',
          fontSize: 11,
          color: '#1E293B',
          lineHeight: 1.3,
          justify: true,
        },
      });
      const data = service.transform(makeAst({ theme }));
      expect(data.theme!.global.fontFamily).toBe('Merriweather');
    });
  });

  describe('page layout', () => {
    it('should preserve page dimensions in mm', () => {
      const data = service.transform(makeAst());
      expect(data.page.widthMm).toBe(210);
      expect(data.page.heightMm).toBe(297);
      expect(data.page.marginTopMm).toBe(15);
      expect(data.page.marginBottomMm).toBe(15);
      expect(data.page.marginLeftMm).toBe(15);
      expect(data.page.marginRightMm).toBe(15);
    });
  });

  describe('global styles', () => {
    it('should preserve global styles as-is', () => {
      const data = service.transform(makeAst());
      expect(data.globalStyles.accent).toBe('#3B82F6');
      expect(data.globalStyles.textPrimary).toBe('#1E293B');
      expect(data.globalStyles.textSecondary).toBe('#64748B');
      expect(data.globalStyles.background).toBe('#FFFFFF');
    });
  });

  describe('header', () => {
    it('should include header when present', () => {
      const data = service.transform(makeAst());
      expect(data.header).toBeDefined();
      expect(data.header!.fullName).toBe('Jane Doe');
      expect(data.header!.email).toBe('jane@example.com');
    });

    it('should omit header when not in AST', () => {
      const ast = makeAst();
      delete (ast as unknown as Record<string, unknown>).header;
      const data = service.transform(ast);
      expect(data.header).toBeUndefined();
    });
  });

  describe('sections', () => {
    it('should preserve section data as-is', () => {
      const data = service.transform(makeAst());
      const sectionData = data.sections[0].data;
      expect(sectionData.semanticKind).toBe('WORK_EXPERIENCE');
      expect(sectionData.title).toBe('Experience');
    });

    it('should preserve column assignment and order', () => {
      const data = service.transform(makeAst());
      expect(data.sections[0].columnId).toBe('main');
      expect(data.sections[0].order).toBe(0);
    });

    it('should handle empty sections array', () => {
      const data = service.transform(makeAst({ sections: [] }));
      expect(data.sections).toHaveLength(0);
    });
  });

  describe('theme passthrough', () => {
    it('should pass theme tokens through with font sanitization only', () => {
      const theme = makeTheme();
      const data = service.transform(makeAst({ theme }));

      expect(data.theme!.page).toEqual(theme.page);
      expect(data.theme!.header.divider).toEqual(theme.header.divider);
      expect(data.theme!.sectionHeader).toEqual(theme.sectionHeader);
      expect(data.theme!.entry).toEqual(theme.entry);
      expect(data.theme!.bullets).toEqual(theme.bullets);
      expect(data.theme!.technologies).toEqual(theme.technologies);
      expect(data.theme!.skillsList).toEqual(theme.skillsList);
      expect(data.theme!.textSection).toEqual(theme.textSection);
    });

    it('should preserve numeric theme values unchanged', () => {
      const theme = makeTheme();
      const data = service.transform(makeAst({ theme }));

      expect(data.theme!.header.name.fontSize).toBe(24);
      expect(data.theme!.header.name.tracking).toBe(0.5);
      expect(data.theme!.header.divider.weight).toBe(1);
      expect(data.theme!.global.lineHeight).toBe(1.3);
      expect(data.theme!.global.justify).toBe(true);
    });
  });

  describe('full round-trip', () => {
    it('should produce expected structure from input AST', () => {
      const ast = makeAst({ theme: makeTheme() });
      const json = service.serialize(ast);
      const parsed = JSON.parse(json) as TypstResumeDataV2;

      // Meta
      expect(parsed.meta.version).toBe('2.0.0');
      expect(parsed.meta.generatedAt).toBe('2026-01-01T00:00:00.000Z');

      // Header
      expect(parsed.header!.fullName).toBe('Jane Doe');

      // Page
      expect(parsed.page.widthMm).toBe(210);

      // Sections with converted values
      expect(parsed.sections).toHaveLength(1);
      expect(parsed.sections[0].styles.title.fontSizePt).toBe(16.5);
      expect(parsed.sections[0].styles.title.fontFamily).toBe('Inter');
      expect(parsed.sections[0].styles.content.fontSizePt).toBe(12);
      expect(parsed.sections[0].styles.container.paddingPt).toBe(12);

      // Global styles
      expect(parsed.globalStyles.accent).toBe('#3B82F6');

      // Theme with sanitized fonts
      expect(parsed.theme).toBeDefined();
      expect(parsed.theme!.header.name.fontFamily).toBe('Inter');
      expect(parsed.theme!.global.fontFamily).toBe('Inter');
      expect(parsed.theme!.page.width).toBe(210);
    });
  });
});
