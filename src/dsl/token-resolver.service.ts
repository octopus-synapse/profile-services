/**
 * Token Resolver Service
 * Resolves semantic tokens to concrete values
 *
 * This is where the magic happens:
 * - "spacing: compact" → "gapPx: 8"
 * - "borderRadius: lg" → "borderRadiusPx: 12"
 * - "fontSize: base" → "fontSizePx: 16"
 */

import { Injectable } from '@nestjs/common';
import type { DesignTokens } from '@octopus-synapse/profile-contracts';

// Resolved concrete values (no more semantic tokens)
export interface ResolvedTokens {
  typography: {
    headingFontFamily: string;
    bodyFontFamily: string;
    baseFontSizePx: number;
    headingFontSizePx: number;
    lineHeight: number;
    headingFontWeight: number;
    bodyFontWeight: number;
    headingTextTransform: 'none' | 'uppercase' | 'lowercase';
    headingBorderBottom: string | null;
    headingBorderLeft: string | null;
    headingPaddingLeft: number;
  };
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    textPrimary: string;
    textSecondary: string;
    textAccent: string;
    border: string;
    divider: string;
  };
  spacing: {
    sectionGapPx: number;
    itemGapPx: number;
    contentPaddingPx: number;
    densityFactor: number;
  };
  effects: {
    borderRadiusPx: number;
    boxShadow: string;
  };
}

@Injectable()
export class TokenResolverService {
  // Font family mappings
  private readonly fontFamilies: Record<string, string> = {
    inter: 'Inter, system-ui, sans-serif',
    merriweather: 'Merriweather, Georgia, serif',
    roboto: 'Roboto, Arial, sans-serif',
    'open-sans': 'Open Sans, Arial, sans-serif',
    'playfair-display': 'Playfair Display, Georgia, serif',
    'source-serif': 'Source Serif Pro, Georgia, serif',
    lato: 'Lato, Arial, sans-serif',
    poppins: 'Poppins, Arial, sans-serif',
  };

  // Font size mappings (in px)
  private readonly fontSizes: Record<
    string,
    { base: number; heading: number }
  > = {
    sm: { base: 14, heading: 18 },
    base: { base: 16, heading: 22 },
    lg: { base: 18, heading: 26 },
  };

  // Spacing mappings (in px)
  private readonly spacingSizes: Record<string, number> = {
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
  };

  // Density factors
  private readonly densityFactors: Record<string, number> = {
    compact: 0.75,
    comfortable: 1,
    spacious: 1.25,
  };

  // Border radius mappings (in px)
  private readonly borderRadii: Record<string, number> = {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999,
  };

  // Shadow mappings
  private readonly shadows: Record<string, string> = {
    none: 'none',
    subtle: '0 1px 2px rgba(0, 0, 0, 0.05)',
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    strong: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  };

  /**
   * Resolve semantic tokens to concrete values
   */
  resolve(tokens: DesignTokens): ResolvedTokens {
    const { typography, colors, spacing } = tokens;
    const fontSize = this.fontSizes[typography.fontSize] ?? this.fontSizes.base;
    const densityFactor = this.densityFactors[spacing.density] ?? 1;

    // Resolve heading style
    const headingStyle = this.resolveHeadingStyle(
      typography.headingStyle,
      colors.colors.primary,
    );

    return {
      typography: {
        headingFontFamily:
          this.fontFamilies[typography.fontFamily.heading] ??
          this.fontFamilies.inter,
        bodyFontFamily:
          this.fontFamilies[typography.fontFamily.body] ??
          this.fontFamilies.inter,
        baseFontSizePx: fontSize.base,
        headingFontSizePx: fontSize.heading,
        lineHeight: 1.5,
        headingFontWeight: headingStyle.fontWeight,
        bodyFontWeight: 400,
        headingTextTransform: headingStyle.textTransform,
        headingBorderBottom: headingStyle.borderBottom,
        headingBorderLeft: headingStyle.borderLeft,
        headingPaddingLeft: headingStyle.paddingLeft,
      },
      colors: {
        primary: colors.colors.primary,
        secondary: colors.colors.secondary,
        background: colors.colors.background,
        surface: colors.colors.surface,
        textPrimary: colors.colors.text.primary,
        textSecondary: colors.colors.text.secondary,
        textAccent: colors.colors.text.accent,
        border: colors.colors.border,
        divider: colors.colors.divider,
      },
      spacing: {
        sectionGapPx: Math.round(
          (this.spacingSizes[spacing.sectionGap] ?? 24) * densityFactor,
        ),
        itemGapPx: Math.round(
          (this.spacingSizes[spacing.itemGap] ?? 16) * densityFactor,
        ),
        contentPaddingPx: Math.round(
          (this.spacingSizes[spacing.contentPadding] ?? 16) * densityFactor,
        ),
        densityFactor,
      },
      effects: {
        borderRadiusPx: this.borderRadii[colors.borderRadius] ?? 8,
        boxShadow: this.shadows[colors.shadows] ?? 'none',
      },
    };
  }

  private resolveHeadingStyle(
    style: string,
    accentColor: string,
  ): {
    fontWeight: number;
    textTransform: 'none' | 'uppercase' | 'lowercase';
    borderBottom: string | null;
    borderLeft: string | null;
    paddingLeft: number;
  } {
    switch (style) {
      case 'bold':
        return {
          fontWeight: 700,
          textTransform: 'none',
          borderBottom: null,
          borderLeft: null,
          paddingLeft: 0,
        };
      case 'underline':
        return {
          fontWeight: 600,
          textTransform: 'none',
          borderBottom: `2px solid ${accentColor}`,
          borderLeft: null,
          paddingLeft: 0,
        };
      case 'uppercase':
        return {
          fontWeight: 600,
          textTransform: 'uppercase',
          borderBottom: null,
          borderLeft: null,
          paddingLeft: 0,
        };
      case 'accent-border':
        return {
          fontWeight: 700,
          textTransform: 'none',
          borderBottom: null,
          borderLeft: `4px solid ${accentColor}`,
          paddingLeft: 12,
        };
      case 'minimal':
        return {
          fontWeight: 500,
          textTransform: 'none',
          borderBottom: null,
          borderLeft: null,
          paddingLeft: 0,
        };
      default:
        return {
          fontWeight: 700,
          textTransform: 'none',
          borderBottom: null,
          borderLeft: null,
          paddingLeft: 0,
        };
    }
  }
}
