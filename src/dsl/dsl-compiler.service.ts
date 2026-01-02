/**
 * DSL Compiler Service
 * Compiles Resume DSL → AST intermediário
 *
 * This is the core compilation engine.
 * DSL (input) → AST (output)
 *
 * The AST is:
 * - Layout fully decided
 * - Tokens resolved to concrete values
 * - No CSS, no JSX, no Tailwind
 * - Pure structural data
 *
 * Frontend just renders, never decides.
 */

import { Injectable } from '@nestjs/common';
import type { ResumeDsl, ResumeAst } from '@octopus-synapse/profile-contracts';
import { DslValidatorService } from './dsl-validator.service';
import {
  TokenResolverService,
  type ResolvedTokens,
} from './token-resolver.service';

// Paper dimensions in mm
const PAPER_SIZES = {
  a4: { width: 210, height: 297 },
  letter: { width: 216, height: 279 },
  legal: { width: 216, height: 356 },
};

// Margin sizes in mm
const MARGINS = {
  compact: 10,
  normal: 15,
  relaxed: 20,
  wide: 25,
};

// Column distributions as percentages
const COLUMN_DISTRIBUTIONS: Record<string, [number, number]> = {
  '50-50': [50, 50],
  '60-40': [60, 40],
  '65-35': [65, 35],
  '70-30': [70, 30],
};

@Injectable()
export class DslCompilerService {
  constructor(
    private validator: DslValidatorService,
    private tokenResolver: TokenResolverService,
  ) {}

  /**
   * Compile DSL to AST for HTML rendering
   */
  compileForHtml(dsl: ResumeDsl): ResumeAst {
    return this.compile(dsl, 'html');
  }

  /**
   * Compile DSL to AST for PDF rendering
   */
  compileForPdf(dsl: ResumeDsl): ResumeAst {
    return this.compile(dsl, 'pdf');
  }

  /**
   * Main compilation method
   */
  compile(dsl: ResumeDsl, target: 'html' | 'pdf' = 'html'): ResumeAst {
    // 1. Validate
    const validatedDsl = this.validator.validateOrThrow(dsl);

    // 2. Resolve tokens
    const resolvedTokens = this.tokenResolver.resolve(validatedDsl.tokens);

    // 3. Build page layout
    const pageLayout = this.buildPageLayout(validatedDsl, resolvedTokens);

    // 4. Place sections
    const placedSections = this.placeSections(validatedDsl, resolvedTokens);

    // 5. Build AST
    const ast: ResumeAst = {
      meta: {
        version: validatedDsl.version,
        generatedAt: new Date().toISOString(),
      },
      page: pageLayout,
      sections: placedSections,
      globalStyles: {
        background: resolvedTokens.colors.background,
        textPrimary: resolvedTokens.colors.textPrimary,
        textSecondary: resolvedTokens.colors.textSecondary,
        accent: resolvedTokens.colors.primary,
      },
    };

    return ast;
  }

  /**
   * Validate and compile raw input (for preview endpoint)
   */
  compileFromRaw(input: unknown, target: 'html' | 'pdf' = 'html'): ResumeAst {
    const dsl = this.validator.validateOrThrow(input);
    return this.compile(dsl, target);
  }

  private buildPageLayout(
    dsl: ResumeDsl,
    tokens: ResolvedTokens,
  ): ResumeAst['page'] {
    const { layout } = dsl;
    const paper = PAPER_SIZES[layout.paperSize] ?? PAPER_SIZES.a4;
    const margin = MARGINS[layout.margins] ?? MARGINS.normal;

    // Determine columns based on layout type
    const columns = this.buildColumns(layout.type, layout.columnDistribution);
    const columnGap = tokens.spacing.sectionGapPx / 4; // Convert px to mm approximation

    return {
      widthMm: paper.width,
      heightMm: paper.height,
      marginTopMm: margin,
      marginBottomMm: margin,
      marginLeftMm: margin,
      marginRightMm: margin,
      columns,
      columnGapMm: columnGap,
    };
  }

  private buildColumns(
    layoutType: string,
    distribution?: string,
  ): ResumeAst['page']['columns'] {
    switch (layoutType) {
      case 'single-column':
        return [{ id: 'main', widthPercentage: 100, order: 0 }];

      case 'two-column':
      case 'sidebar-right': {
        const [main, sidebar] = COLUMN_DISTRIBUTIONS[
          distribution ?? '70-30'
        ] ?? [70, 30];
        return [
          { id: 'main', widthPercentage: main, order: 0 },
          { id: 'sidebar', widthPercentage: sidebar, order: 1 },
        ];
      }

      case 'sidebar-left': {
        const [main, sidebar] = COLUMN_DISTRIBUTIONS[
          distribution ?? '70-30'
        ] ?? [70, 30];
        return [
          { id: 'sidebar', widthPercentage: sidebar, order: 0 },
          { id: 'main', widthPercentage: main, order: 1 },
        ];
      }

      case 'magazine': {
        return [
          { id: 'main', widthPercentage: 60, order: 0 },
          { id: 'sidebar', widthPercentage: 40, order: 1 },
        ];
      }

      case 'compact':
        return [{ id: 'main', widthPercentage: 100, order: 0 }];

      default:
        return [{ id: 'main', widthPercentage: 100, order: 0 }];
    }
  }

  private placeSections(
    dsl: ResumeDsl,
    tokens: ResolvedTokens,
  ): ResumeAst['sections'] {
    const visibleSections = dsl.sections
      .filter((s) => s.visible)
      .sort((a, b) => a.order - b.order);

    return visibleSections.map((section) => {
      // Map column from DSL to AST column id
      const columnId = this.mapColumnToId(section.column);

      return {
        sectionId: section.id,
        columnId,
        order: section.order,
        styles: {
          container: {
            backgroundColor: 'transparent',
            borderColor: tokens.colors.border,
            borderWidthPx: 0,
            borderRadiusPx: tokens.effects.borderRadiusPx,
            paddingPx: tokens.spacing.contentPaddingPx,
            marginBottomPx: tokens.spacing.sectionGapPx,
            shadow:
              tokens.effects.boxShadow !== 'none'
                ? tokens.effects.boxShadow
                : undefined,
          },
          title: {
            fontFamily: tokens.typography.headingFontFamily,
            fontSizePx: tokens.typography.headingFontSizePx,
            lineHeight: tokens.typography.lineHeight,
            fontWeight: tokens.typography.headingFontWeight,
            textTransform: tokens.typography.headingTextTransform,
            textDecoration: 'none',
          },
          content: {
            fontFamily: tokens.typography.bodyFontFamily,
            fontSizePx: tokens.typography.baseFontSizePx,
            lineHeight: tokens.typography.lineHeight,
            fontWeight: tokens.typography.bodyFontWeight,
            textTransform: 'none',
            textDecoration: 'none',
          },
        },
      };
    });
  }

  private mapColumnToId(column: string): string {
    switch (column) {
      case 'main':
        return 'main';
      case 'sidebar':
        return 'sidebar';
      case 'full-width':
        return 'main'; // Full-width sections go to main column
      default:
        return 'main';
    }
  }
}
