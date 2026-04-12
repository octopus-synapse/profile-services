import { describe, expect, test } from 'bun:test';
import {
  AstDesignTokensSchema,
  AtsConfigSchema,
  ResumeAstV2Schema,
  ResumeMetadataSchema,
} from './resume-ast-v2.schema';

// ── Fixtures ────────────────────────────────────────────────────────

function validDesignTokens() {
  return {
    page: {
      width: 210,
      height: 297,
      marginTop: 20,
      marginBottom: 20,
      marginLeft: 15,
      marginRight: 15,
      background: '#ffffff',
    },
    header: {
      name: {
        fontSize: 24,
        fontWeight: 700,
        fontFamily: 'Inter',
        color: '#111',
        tracking: 0,
        alignment: 'left' as const,
      },
      jobTitle: { fontSize: 14, fontWeight: 400, fontFamily: 'Inter', color: '#333', tracking: 0 },
      contact: {
        fontSize: 10,
        fontFamily: 'Inter',
        color: '#555',
        separator: '|',
        separatorColor: '#ccc',
      },
      divider: { show: true, weight: 1, color: '#000', marginTop: 8, marginBottom: 8 },
    },
    sectionHeader: {
      fontSize: 14,
      fontWeight: 700,
      fontFamily: 'Inter',
      color: '#111',
      tracking: 0.5,
      textTransform: 'uppercase' as 'none' | 'uppercase' | 'lowercase',
      marginTop: 12,
      marginBottom: 4,
      accentBar: { show: true, width: 3, height: 16, color: '#0066cc', offsetY: 0 },
      divider: { show: false, weight: 1, color: '#ddd', marginTop: 4 },
    },
    entry: {
      gap: 6,
      title: { fontSize: 12, fontWeight: 600, fontFamily: 'Inter', color: '#111' },
      date: { fontSize: 10, fontFamily: 'Inter', color: '#666' },
      subtitle: { fontSize: 11, fontWeight: 400, fontFamily: 'Inter', color: '#333' },
      employmentType: { separator: ' - ' },
      link: { fontSize: 10, fontFamily: 'Inter', color: '#0066cc', underline: true },
    },
    bullets: {
      marker: '\u2022',
      fontSize: 10,
      fontFamily: 'Inter',
      color: '#333',
      spacing: 2,
      indent: 12,
      bodyIndent: 4,
      marginTop: 2,
    },
    technologies: {
      show: true,
      label: 'Technologies:',
      fontSize: 10,
      fontFamily: 'Inter',
      color: '#555',
      labelWeight: 600,
      marginTop: 4,
    },
    skillsList: {
      fontSize: 10,
      fontFamily: 'Inter',
      color: '#333',
      separator: ',',
      separatorColor: '#999',
      justify: false,
    },
    textSection: {
      fontSize: 10,
      fontFamily: 'Inter',
      color: '#333',
      lineHeight: 1.5,
      justify: true,
    },
    global: { fontFamily: 'Inter', fontSize: 10, color: '#333', lineHeight: 1.4, justify: false },
  };
}

function validAstV2() {
  return {
    meta: { version: '2.0', generatedAt: '2026-01-01T00:00:00Z' },
    page: {
      widthMm: 210,
      heightMm: 297,
      marginTopMm: 20,
      marginBottomMm: 20,
      marginLeftMm: 15,
      marginRightMm: 15,
      columns: [{ id: 'main', widthPercentage: 100, order: 0 }],
      columnGapMm: 0,
    },
    sections: [
      {
        sectionId: 'experience',
        columnId: 'main',
        order: 0,
        data: {
          semanticKind: 'work',
          sectionTypeKey: 'WORK_EXPERIENCE',
          title: 'Experience',
          items: [{ id: 'item-1', content: { company: 'Acme' } }],
        },
        styles: {
          container: {
            backgroundColor: '#fff',
            borderColor: '#000',
            borderWidthPx: 0,
            borderRadiusPx: 0,
            paddingPx: 0,
            marginBottomPx: 8,
          },
          title: {
            fontFamily: 'Inter',
            fontSizePx: 14,
            lineHeight: 1.2,
            fontWeight: 700,
            textTransform: 'none' as const,
            textDecoration: 'none' as const,
          },
          content: {
            fontFamily: 'Inter',
            fontSizePx: 10,
            lineHeight: 1.4,
            fontWeight: 400,
            textTransform: 'none' as const,
            textDecoration: 'none' as const,
          },
        },
      },
    ],
    globalStyles: {
      background: '#ffffff',
      textPrimary: '#111111',
      textSecondary: '#555555',
      accent: '#0066cc',
    },
    resumeMetadata: { language: 'pt-BR', targetRole: 'Backend Engineer', seniorityLevel: 'Senior' },
    atsConfig: { themeScore: 85, resumeScore: 72 },
    theme: validDesignTokens(),
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('ResumeMetadataSchema', () => {
  test('accepts full metadata', () => {
    const data = { targetRole: 'Backend Engineer', seniorityLevel: 'Senior', language: 'pt-BR' };
    expect(ResumeMetadataSchema.parse(data)).toEqual(data);
  });

  test('accepts metadata with only required language', () => {
    const data = { language: 'en' };
    expect(ResumeMetadataSchema.parse(data)).toEqual(data);
  });

  test('rejects missing language', () => {
    expect(() => ResumeMetadataSchema.parse({ targetRole: 'Dev' })).toThrow();
  });
});

describe('AtsConfigSchema', () => {
  test('accepts valid scores', () => {
    const data = { themeScore: 90, resumeScore: 75 };
    expect(AtsConfigSchema.parse(data)).toEqual(data);
  });

  test('accepts boundary values 0 and 100', () => {
    expect(AtsConfigSchema.parse({ themeScore: 0, resumeScore: 100 })).toEqual({
      themeScore: 0,
      resumeScore: 100,
    });
  });

  test('rejects score above 100', () => {
    expect(() => AtsConfigSchema.parse({ themeScore: 101, resumeScore: 50 })).toThrow();
  });

  test('rejects score below 0', () => {
    expect(() => AtsConfigSchema.parse({ themeScore: 50, resumeScore: -1 })).toThrow();
  });

  test('rejects missing fields', () => {
    expect(() => AtsConfigSchema.parse({ themeScore: 50 })).toThrow();
  });
});

describe('AstDesignTokensSchema', () => {
  test('accepts valid design tokens', () => {
    const tokens = validDesignTokens();
    expect(AstDesignTokensSchema.parse(tokens)).toEqual(tokens);
  });

  test('rejects missing top-level key', () => {
    const { bullets: _, ...rest } = validDesignTokens();
    expect(() => AstDesignTokensSchema.parse(rest)).toThrow();
  });

  test('validates header name alignment enum', () => {
    const tokens = validDesignTokens();
    tokens.header.name.alignment = 'right' as 'left';
    expect(() => AstDesignTokensSchema.parse(tokens)).toThrow();
  });

  test('validates sectionHeader textTransform enum', () => {
    const tokens = validDesignTokens();
    tokens.sectionHeader.textTransform = 'capitalize' as unknown as 'none';
    expect(() => AstDesignTokensSchema.parse(tokens)).toThrow();
  });
});

describe('ResumeAstV2Schema', () => {
  test('parses a full valid V2 AST', () => {
    const ast = validAstV2();
    const parsed = ResumeAstV2Schema.parse(ast);
    expect(parsed.meta.version).toBe('2.0');
    expect(parsed.resumeMetadata.language).toBe('pt-BR');
    expect(parsed.atsConfig.themeScore).toBe(85);
    expect(parsed.theme.global.fontFamily).toBe('Inter');
    expect(parsed.sections).toHaveLength(1);
  });

  test('rejects when resumeMetadata is missing', () => {
    const { resumeMetadata: _, ...rest } = validAstV2();
    expect(() => ResumeAstV2Schema.parse(rest)).toThrow();
  });

  test('rejects when atsConfig is missing', () => {
    const { atsConfig: _, ...rest } = validAstV2();
    expect(() => ResumeAstV2Schema.parse(rest)).toThrow();
  });

  test('rejects when theme is missing', () => {
    const { theme: _, ...rest } = validAstV2();
    expect(() => ResumeAstV2Schema.parse(rest)).toThrow();
  });

  test('preserves inherited fields from V1 (page, sections, globalStyles)', () => {
    const ast = validAstV2();
    const parsed = ResumeAstV2Schema.parse(ast);
    expect(parsed.page.widthMm).toBe(210);
    expect(parsed.globalStyles.accent).toBe('#0066cc');
    expect(parsed.sections[0].sectionId).toBe('experience');
  });
});
