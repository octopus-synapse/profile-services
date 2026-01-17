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
 *
 * Design:
 * - Uses SectionMapperRegistry for section-specific mapping (Strategy Pattern)
 * - Each section type has its own mapper class
 * - New sections can be added by registering new mappers
 */

import { Injectable } from '@nestjs/common';
import type { ResumeDsl, ResumeAst } from '@octopus-synapse/profile-contracts';
import {
  Resume,
  Experience,
  Education,
  Skill,
  Language,
  Project,
  Certification,
  Award,
  Recommendation,
  Interest,
} from '@prisma/client';
import { DslValidatorService } from './dsl-validator.service';
import {
  TokenResolverService,
  type ResolvedTokens,
} from './token-resolver.service';
import { DslMigrationService } from './migrators';
import { SectionMapperRegistry } from './mappers';

export type ResumeWithRelations = Resume & {
  experiences: Experience[];
  education: Education[];
  skills: Skill[];
  languages: Language[];
  projects: Project[];
  certifications: Certification[];
  awards: Award[];
  recommendations: Recommendation[];
  interests: Interest[];
  activeTheme?: {
    id: string;
    name: string;
    styleConfig: unknown;
  } | null;
};

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

/** Current DSL version */
const CURRENT_DSL_VERSION = '1.0.0';

@Injectable()
export class DslCompilerService {
  private readonly sectionRegistry: SectionMapperRegistry;

  constructor(
    private validator: DslValidatorService,
    private tokenResolver: TokenResolverService,
    private migrationService: DslMigrationService,
  ) {
    this.sectionRegistry = new SectionMapperRegistry();
  }

  /**
   * Migrate DSL to current version if needed
   */
  private migrateDsl(dsl: ResumeDsl): ResumeDsl {
    if (dsl.version === CURRENT_DSL_VERSION) {
      return dsl;
    }
    return this.migrationService.migrate(dsl, CURRENT_DSL_VERSION);
  }

  /**
   * Compile DSL to AST for HTML rendering
   */
  compileForHtml(dsl: ResumeDsl, resumeData?: ResumeWithRelations): ResumeAst {
    return this.compile(dsl, 'html', resumeData);
  }

  /**
   * Compile DSL to AST for PDF rendering
   */
  compileForPdf(dsl: ResumeDsl, resumeData?: ResumeWithRelations): ResumeAst {
    return this.compile(dsl, 'pdf', resumeData);
  }

  /**
   * Main compilation method
   */
  compile(
    dsl: ResumeDsl,
    _target: 'html' | 'pdf' = 'html',
    resumeData?: ResumeWithRelations,
  ): ResumeAst {
    // 0. Migrate DSL to latest version
    const migratedDsl = this.migrateDsl(dsl);

    // 1. Validate
    const validatedDsl = this.validator.validateOrThrow(migratedDsl);

    // 2. Resolve tokens
    const resolvedTokens = this.tokenResolver.resolve(validatedDsl.tokens);

    // 3. Build page layout
    const pageLayout = this.buildPageLayout(validatedDsl, resolvedTokens);

    // 4. Place sections
    const placedSections = this.placeSections(
      validatedDsl,
      resolvedTokens,
      resumeData,
    );

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
    const paper = PAPER_SIZES[layout.paperSize];
    const margin = MARGINS[layout.margins];

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
    resumeData?: ResumeWithRelations,
  ): ResumeAst['sections'] {
    const visibleSections = dsl.sections
      .filter((s) => s.visible)
      .sort((a, b) => a.order - b.order);

    return visibleSections.map((section) => {
      // Map column from DSL to AST column id
      const columnId = this.mapColumnToId(section.column);

      // Compile section data using registry (Strategy Pattern)
      const overrides = dsl.itemOverrides?.[section.id] ?? [];
      const data = resumeData
        ? (this.sectionRegistry.mapSection(section.id, resumeData, overrides) ??
          this.sectionRegistry.getPlaceholder(section.id))
        : this.sectionRegistry.getPlaceholder(section.id);

      return {
        sectionId: section.id,
        columnId,
        order: section.order,
        data,
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
