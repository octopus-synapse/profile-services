import type { ResolvedTokens } from '../../dsl/token-resolver.service';

type TextDecoration = 'none' | 'underline' | 'line-through';
type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

export function buildSectionStyles(tokens: ResolvedTokens) {
  return {
    container: {
      backgroundColor: 'transparent',
      borderColor: tokens.colors.border,
      borderWidthPx: 0,
      borderRadiusPx: tokens.effects.borderRadiusPx,
      paddingPx: tokens.spacing.contentPaddingPx,
      marginBottomPx: tokens.spacing.sectionGapPx,
      shadow: tokens.effects.boxShadow !== 'none' ? tokens.effects.boxShadow : undefined,
    },
    title: {
      fontFamily: tokens.typography.headingFontFamily,
      fontSizePx: tokens.typography.headingFontSizePx,
      lineHeight: tokens.typography.lineHeight,
      fontWeight: tokens.typography.headingFontWeight,
      textTransform: tokens.typography.headingTextTransform as TextTransform,
      textDecoration: 'none' as TextDecoration,
    },
    content: {
      fontFamily: tokens.typography.bodyFontFamily,
      fontSizePx: tokens.typography.baseFontSizePx,
      lineHeight: tokens.typography.lineHeight,
      fontWeight: tokens.typography.bodyFontWeight,
      textTransform: 'none' as TextTransform,
      textDecoration: 'none' as TextDecoration,
    },
  };
}
