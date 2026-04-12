import { describe, expect, it } from 'bun:test';
import {
  DESIGN_TOKENS_V2_DEFAULTS,
  DesignTokensV2Schema,
  migrateFromSymbolicTokens,
} from './design-tokens-v2.schema';

describe('DesignTokensV2Schema', () => {
  describe('validation', () => {
    it('should accept valid defaults', () => {
      const result = DesignTokensV2Schema.safeParse(DESIGN_TOKENS_V2_DEFAULTS);
      expect(result.success).toBe(true);
    });

    it('should reject missing top-level keys', () => {
      const result = DesignTokensV2Schema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject invalid page dimensions', () => {
      const invalid = {
        ...DESIGN_TOKENS_V2_DEFAULTS,
        page: { ...DESIGN_TOKENS_V2_DEFAULTS.page, width: 'not-a-number' },
      };
      const result = DesignTokensV2Schema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid header name alignment', () => {
      const invalid = {
        ...DESIGN_TOKENS_V2_DEFAULTS,
        header: {
          ...DESIGN_TOKENS_V2_DEFAULTS.header,
          name: {
            ...DESIGN_TOKENS_V2_DEFAULTS.header.name,
            alignment: 'right',
          },
        },
      };
      const result = DesignTokensV2Schema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid textTransform value', () => {
      const invalid = {
        ...DESIGN_TOKENS_V2_DEFAULTS,
        sectionHeader: {
          ...DESIGN_TOKENS_V2_DEFAULTS.sectionHeader,
          textTransform: 'capitalize',
        },
      };
      const result = DesignTokensV2Schema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept center alignment for header name', () => {
      const valid = {
        ...DESIGN_TOKENS_V2_DEFAULTS,
        header: {
          ...DESIGN_TOKENS_V2_DEFAULTS.header,
          name: {
            ...DESIGN_TOKENS_V2_DEFAULTS.header.name,
            alignment: 'center',
          },
        },
      };
      const result = DesignTokensV2Schema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept lowercase textTransform', () => {
      const valid = {
        ...DESIGN_TOKENS_V2_DEFAULTS,
        sectionHeader: {
          ...DESIGN_TOKENS_V2_DEFAULTS.sectionHeader,
          textTransform: 'lowercase',
        },
      };
      const result = DesignTokensV2Schema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('defaults', () => {
    it('should use A4 page dimensions', () => {
      expect(DESIGN_TOKENS_V2_DEFAULTS.page.width).toBe(210);
      expect(DESIGN_TOKENS_V2_DEFAULTS.page.height).toBe(297);
    });

    it('should use Inter font family globally', () => {
      expect(DESIGN_TOKENS_V2_DEFAULTS.global.fontFamily).toContain('Inter');
    });

    it('should use dark text color', () => {
      expect(DESIGN_TOKENS_V2_DEFAULTS.global.color).toBe('#0f0f0f');
    });

    it('should use blue accent for section header accent bar', () => {
      expect(DESIGN_TOKENS_V2_DEFAULTS.sectionHeader.accentBar.color).toBe('#2563eb');
    });

    it('should use white page background', () => {
      expect(DESIGN_TOKENS_V2_DEFAULTS.page.background).toBe('#ffffff');
    });

    it('should have bullet marker as unicode bullet', () => {
      expect(DESIGN_TOKENS_V2_DEFAULTS.bullets.marker).toBe('\u2022');
    });
  });
});

describe('migrateFromSymbolicTokens', () => {
  const baseV1 = {
    typography: {
      fontFamily: { heading: 'inter', body: 'inter' },
      fontSize: 'base',
      headingStyle: 'bold',
    },
    colors: {
      colors: {
        primary: '#2563eb',
        secondary: '#64748b',
        background: '#ffffff',
        surface: '#f8f9fa',
        text: {
          primary: '#1e293b',
          secondary: '#64748b',
          accent: '#2563eb',
        },
        border: '#e2e8f0',
        divider: '#e2e8f0',
      },
    },
    spacing: {
      density: 'comfortable',
      sectionGap: 'md',
      itemGap: 'sm',
      contentPadding: 'md',
    },
  };

  it('should produce a valid V2 schema', () => {
    const result = migrateFromSymbolicTokens(baseV1);
    const parsed = DesignTokensV2Schema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it('should resolve font family from symbolic key', () => {
    const result = migrateFromSymbolicTokens(baseV1);
    expect(result.header.name.fontFamily).toContain('Inter');
    expect(result.global.fontFamily).toContain('Inter');
  });

  it('should resolve font family for serif fonts', () => {
    const v1 = {
      ...baseV1,
      typography: {
        ...baseV1.typography,
        fontFamily: { heading: 'merriweather', body: 'roboto' },
      },
    };
    const result = migrateFromSymbolicTokens(v1);
    expect(result.header.name.fontFamily).toContain('Merriweather');
    expect(result.global.fontFamily).toContain('Roboto');
  });

  it('should resolve font sizes from symbolic size key', () => {
    const smResult = migrateFromSymbolicTokens({
      ...baseV1,
      typography: { ...baseV1.typography, fontSize: 'sm' },
    });
    const lgResult = migrateFromSymbolicTokens({
      ...baseV1,
      typography: { ...baseV1.typography, fontSize: 'lg' },
    });
    expect(smResult.header.name.fontSize).toBe(18);
    expect(lgResult.header.name.fontSize).toBe(26);
  });

  it('should apply density factor to spacing', () => {
    const compact = migrateFromSymbolicTokens({
      ...baseV1,
      spacing: { ...baseV1.spacing, density: 'compact' },
    });
    const spacious = migrateFromSymbolicTokens({
      ...baseV1,
      spacing: { ...baseV1.spacing, density: 'spacious' },
    });
    expect(compact.sectionHeader.marginTop).toBeLessThan(spacious.sectionHeader.marginTop);
    expect(compact.entry.gap).toBeLessThan(spacious.entry.gap);
  });

  it('should map colors from V1 palette', () => {
    const result = migrateFromSymbolicTokens(baseV1);
    expect(result.header.name.color).toBe('#1e293b');
    expect(result.header.jobTitle.color).toBe('#64748b');
    expect(result.entry.link.color).toBe('#2563eb');
    expect(result.page.background).toBe('#ffffff');
  });

  it('should set uppercase textTransform for uppercase heading style', () => {
    const v1 = {
      ...baseV1,
      typography: { ...baseV1.typography, headingStyle: 'uppercase' },
    };
    const result = migrateFromSymbolicTokens(v1);
    expect(result.sectionHeader.textTransform).toBe('uppercase');
    expect(result.sectionHeader.tracking).toBe(0.5);
  });

  it('should set accent-border heading style to show accent bar', () => {
    const v1 = {
      ...baseV1,
      typography: { ...baseV1.typography, headingStyle: 'accent-border' },
    };
    const result = migrateFromSymbolicTokens(v1);
    expect(result.sectionHeader.accentBar.show).toBe(true);
    expect(result.sectionHeader.divider.show).toBe(false);
  });

  it('should set underline heading style to show divider', () => {
    const v1 = {
      ...baseV1,
      typography: { ...baseV1.typography, headingStyle: 'underline' },
    };
    const result = migrateFromSymbolicTokens(v1);
    expect(result.sectionHeader.divider.show).toBe(true);
    expect(result.sectionHeader.accentBar.show).toBe(false);
  });

  it('should keep A4 page dimensions regardless of V1 input', () => {
    const result = migrateFromSymbolicTokens(baseV1);
    expect(result.page.width).toBe(210);
    expect(result.page.height).toBe(297);
  });

  it('should fall back to defaults for unknown symbolic keys', () => {
    const v1 = {
      typography: {
        fontFamily: { heading: 'unknown-font', body: 'unknown-font' },
        fontSize: 'unknown-size',
        headingStyle: 'bold',
      },
      colors: baseV1.colors,
      spacing: {
        density: 'unknown-density',
        sectionGap: 'unknown-gap',
        itemGap: 'unknown-gap',
        contentPadding: 'unknown-padding',
      },
    };
    const result = migrateFromSymbolicTokens(v1);
    const parsed = DesignTokensV2Schema.safeParse(result);
    expect(parsed.success).toBe(true);
    expect(result.global.fontFamily).toContain('Inter');
    expect(result.header.name.fontSize).toBe(22);
  });
});
