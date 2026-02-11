import { Injectable } from '@nestjs/common';
import type { DesignTokens } from '@/shared-kernel';
import {
  BORDER_RADII,
  DENSITY_FACTORS,
  FONT_FAMILIES,
  FONT_SIZES,
  SHADOWS,
  SPACING_SIZES,
} from '../domain/value-objects/design-token-config';
import { resolveHeadingStyle } from '../domain/value-objects/heading-style';

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
  resolve(tokens: DesignTokens): ResolvedTokens {
    const { typography, colors, spacing } = tokens;
    const fontSize = FONT_SIZES[typography.fontSize] ?? FONT_SIZES.base;
    const densityFactor = DENSITY_FACTORS[spacing.density] ?? 1;
    const headingStyle = resolveHeadingStyle(typography.headingStyle, colors.colors.primary);

    return {
      typography: {
        headingFontFamily: FONT_FAMILIES[typography.fontFamily.heading] ?? FONT_FAMILIES.inter,
        bodyFontFamily: FONT_FAMILIES[typography.fontFamily.body] ?? FONT_FAMILIES.inter,
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
        sectionGapPx: Math.round((SPACING_SIZES[spacing.sectionGap] ?? 24) * densityFactor),
        itemGapPx: Math.round((SPACING_SIZES[spacing.itemGap] ?? 16) * densityFactor),
        contentPaddingPx: Math.round((SPACING_SIZES[spacing.contentPadding] ?? 16) * densityFactor),
        densityFactor,
      },
      effects: {
        borderRadiusPx: BORDER_RADII[colors.borderRadius] ?? 8,
        boxShadow: SHADOWS[colors.shadows] ?? 'none',
      },
    };
  }
}
