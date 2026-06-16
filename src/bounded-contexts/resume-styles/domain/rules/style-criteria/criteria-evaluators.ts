/**
 * Style Score criteria evaluators.
 *
 * The rubric is data-driven: weights, thresholds and allowlists live in
 * the `StyleScoringCriterion` catalog (DB), but the *evaluation* of each
 * criterion is code, keyed by a stable `key`. This mirrors how ATS content
 * scoring keeps `fieldWeights` in JSON while the algorithm stays in code.
 *
 * Each evaluator is pure: it reads the normalized style + the criterion's
 * params and returns whether the criterion passes, plus optional
 * `messageArgs` for the actionable explanation when it fails.
 */

import type { StyleScoreInput } from '../../types';
import { contrastRatio } from './contrast.util';

/** Stable issue code emitted when a criterion fails. Rendered client-side
 * from the code + messageArgs (raw-data pattern, like QualityIssue). */
export const STYLE_ISSUE_CODE: Readonly<Record<string, string>> = {
  'structure.single_column_layout': 'STYLE_MULTI_COLUMN_LAYOUT',
  'structure.single_column_kind': 'STYLE_NON_SINGLE_COLUMN',
  'structure.standard_paper_size': 'STYLE_UNCOMMON_PAPER_SIZE',
  'structure.auto_page_break': 'STYLE_MANUAL_PAGE_BREAK',
  'typography.safe_body_font': 'STYLE_UNSAFE_BODY_FONT',
  'typography.safe_heading_font': 'STYLE_UNSAFE_HEADING_FONT',
  'typography.valid_font_size': 'STYLE_INVALID_FONT_SIZE',
  'typography.simple_heading_style': 'STYLE_DECORATIVE_HEADING',
  'contrast.primary_text_contrast': 'STYLE_LOW_PRIMARY_CONTRAST',
  'contrast.secondary_text_contrast': 'STYLE_LOW_SECONDARY_CONTRAST',
  'decorations.no_shadows': 'STYLE_SHADOWS_PRESENT',
  'decorations.modest_border_radius': 'STYLE_LARGE_BORDER_RADIUS',
  'decorations.no_gradients': 'STYLE_GRADIENTS_ENABLED',
};

export interface EvaluatorOutcome {
  readonly pass: boolean;
  readonly messageArgs?: Record<string, string | number>;
}

type Evaluator = (style: StyleScoreInput, params: Record<string, unknown>) => EvaluatorOutcome;

// ── styleConfig accessors (defensive: the column is untyped JSON) ──────
function asObj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}
function layout(s: StyleScoreInput): Record<string, unknown> {
  return asObj(s.styleConfig.layout);
}
function tokens(s: StyleScoreInput): Record<string, unknown> {
  return asObj(s.styleConfig.tokens);
}
function typography(s: StyleScoreInput): Record<string, unknown> {
  return asObj(tokens(s).typography);
}
function colorTokens(s: StyleScoreInput): Record<string, unknown> {
  return asObj(tokens(s).colors);
}
function palette(s: StyleScoreInput): Record<string, unknown> {
  return asObj(colorTokens(s).colors);
}
function strList(params: Record<string, unknown>, key: string): string[] {
  const v = params[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}
function inAllowlist(value: unknown, allow: string[]): boolean {
  return typeof value === 'string' && allow.includes(value);
}

export const EVALUATORS: Readonly<Record<string, Evaluator>> = {
  'structure.single_column_layout': (s, p) => {
    const type = layout(s).type;
    const pass = inAllowlist(type, strList(p, 'safeLayoutTypes'));
    return pass ? { pass } : { pass, messageArgs: { layout: String(type ?? 'unknown') } };
  },
  'structure.single_column_kind': (s) => ({ pass: s.layoutKind === 'SINGLE_COLUMN' }),
  'structure.standard_paper_size': (s, p) => {
    const size = layout(s).paperSize;
    return { pass: inAllowlist(size, strList(p, 'safePaperSizes')) };
  },
  'structure.auto_page_break': (s, p) => {
    const behavior = layout(s).pageBreakBehavior;
    return { pass: inAllowlist(behavior, strList(p, 'safePageBreaks')) };
  },
  'typography.safe_body_font': (s, p) => {
    const font = asObj(typography(s).fontFamily).body;
    const pass = inAllowlist(font, strList(p, 'safeFonts'));
    return pass ? { pass } : { pass, messageArgs: { font: String(font ?? 'unknown') } };
  },
  'typography.safe_heading_font': (s, p) => {
    const font = asObj(typography(s).fontFamily).heading;
    const pass = inAllowlist(font, strList(p, 'safeFonts'));
    return pass ? { pass } : { pass, messageArgs: { font: String(font ?? 'unknown') } };
  },
  'typography.valid_font_size': (s, p) => {
    return { pass: inAllowlist(typography(s).fontSize, strList(p, 'safeFontSizes')) };
  },
  'typography.simple_heading_style': (s, p) => {
    const style = typography(s).headingStyle;
    const unsafe = strList(p, 'unsafeHeadingStyles');
    return { pass: typeof style === 'string' ? !unsafe.includes(style) : true };
  },
  'contrast.primary_text_contrast': (s, p) => {
    const ratio = contrastRatio(asObj(palette(s).text).primary, palette(s).background);
    const min = typeof p.minRatio === 'number' ? p.minRatio : 4.5;
    if (ratio === null) return { pass: false };
    return ratio >= min
      ? { pass: true }
      : { pass: false, messageArgs: { ratio: Math.round(ratio * 100) / 100, minimum: min } };
  },
  'contrast.secondary_text_contrast': (s, p) => {
    const ratio = contrastRatio(asObj(palette(s).text).secondary, palette(s).background);
    const min = typeof p.minRatio === 'number' ? p.minRatio : 4.5;
    if (ratio === null) return { pass: false };
    return ratio >= min
      ? { pass: true }
      : { pass: false, messageArgs: { ratio: Math.round(ratio * 100) / 100, minimum: min } };
  },
  'decorations.no_shadows': (s) => ({ pass: colorTokens(s).shadows === 'none' }),
  'decorations.modest_border_radius': (s, p) => {
    return { pass: inAllowlist(colorTokens(s).borderRadius, strList(p, 'safeBorderRadii')) };
  },
  'decorations.no_gradients': (s) => {
    const gradients = asObj(colorTokens(s).gradients);
    return { pass: gradients.enabled !== true };
  },
};
