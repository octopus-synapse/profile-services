/**
 * DSL Compiler Service
 *
 * Compiles Resume DSL into Resume AST for rendering.
 * Uses GENERIC SECTIONS - NO type-specific knowledge.
 *
 * Architecture:
 *   - All sections are compiled generically
 *   - The compiler doesn't know what "experience" or "education" is
 *   - Section structure comes from the resume data + SectionType.definition
 *   - Adding a new section type requires ZERO code changes here
 */

import { Injectable } from '@nestjs/common';
import type { SectionDataV2 } from '@/bounded-contexts/dsl/domain/schemas/ast/generic-section-data.schema';
import type { ResumeAst } from '@/bounded-contexts/dsl/domain/schemas/ast/resume-ast.schema';
import type { ResumeDsl } from '@/bounded-contexts/dsl/domain/schemas/dsl';
import type { GenericResume, GenericResumeSection } from '@/shared-kernel/schemas/sections';
import {
  buildPageLayout,
  buildSectionStyles,
  getPlaceholderData,
  type ItemOverride,
  mapColumnToId,
} from '../application/compilers';
import { DslValidatorService } from './dsl-validator.service';
import { DslMigrationService } from './migrators';
import { type ResolvedTokens, TokenResolverService } from './token-resolver.service';

const CURRENT_DSL_VERSION = '1.0.0';

/**
 * Check if an item is visible based on overrides.
 */
function isItemVisible(itemId: string, overrides: ItemOverride[]): boolean {
  const override = overrides.find((o) => o.itemId === itemId);
  return override?.visible !== false;
}

@Injectable()
export class DslCompilerService {
  constructor(
    private validator: DslValidatorService,
    private tokenResolver: TokenResolverService,
    private migrationService: DslMigrationService,
  ) {}

  compileForHtml(
    dsl: ResumeDsl,
    resumeData?: GenericResume,
    sectionTypeTitles?: Map<string, string>,
  ): ResumeAst {
    return this.compile(dsl, 'html', resumeData, sectionTypeTitles);
  }

  compileForPdf(
    dsl: ResumeDsl,
    resumeData?: GenericResume,
    sectionTypeTitles?: Map<string, string>,
  ): ResumeAst {
    return this.compile(dsl, 'pdf', resumeData, sectionTypeTitles);
  }

  compile(
    dsl: ResumeDsl,
    _target: 'html' | 'pdf' = 'html',
    resumeData?: GenericResume,
    sectionTypeTitles?: Map<string, string>,
  ): ResumeAst {
    const migratedDsl = this.migrateDsl(dsl);
    const validatedDsl = this.validator.validateOrThrow(migratedDsl);
    const tokens = this.tokenResolver.resolve(validatedDsl.tokens);
    const pageLayout = buildPageLayout(validatedDsl, tokens);
    const sections = this.placeSections(validatedDsl, tokens, resumeData, sectionTypeTitles);

    return {
      meta: {
        version: validatedDsl.version,
        generatedAt: new Date().toISOString(),
      },
      header: resumeData
        ? {
            fullName: resumeData.fullName,
            jobTitle: resumeData.jobTitle,
            phone: resumeData.phone,
            email: resumeData.emailContact,
            location: resumeData.location,
            linkedin: resumeData.linkedin,
            github: resumeData.github,
            website: resumeData.website,
          }
        : undefined,
      page: pageLayout,
      sections,
      globalStyles: {
        background: tokens.colors.background,
        textPrimary: tokens.colors.textPrimary,
        textSecondary: tokens.colors.textSecondary,
        accent: tokens.colors.primary,
      },
    };
  }

  compileFromRaw(input: unknown, target: 'html' | 'pdf' = 'html'): ResumeAst {
    const dsl = this.validator.validateOrThrow(input);
    return this.compile(dsl, target);
  }

  private migrateDsl(dsl: ResumeDsl): ResumeDsl {
    if (dsl.version === CURRENT_DSL_VERSION) return dsl;
    return this.migrationService.migrate(dsl, CURRENT_DSL_VERSION);
  }

  private placeSections(
    dsl: ResumeDsl,
    tokens: ResolvedTokens,
    resumeData?: GenericResume,
    sectionTypeTitles?: Map<string, string>,
  ): ResumeAst['sections'] {
    return dsl.sections
      .filter((s) => s.visible && s.id !== 'header')
      .sort((a, b) => a.order - b.order)
      .map((section) => {
        const overrides = (dsl.itemOverrides?.[section.id] ?? []) as ItemOverride[];
        const data = resumeData
          ? this.compileSectionData(section.id, resumeData, overrides, sectionTypeTitles)
          : getPlaceholderData(section.id, sectionTypeTitles);

        return {
          sectionId: section.id,
          columnId: mapColumnToId(section.column),
          order: section.order,
          data,
          styles: buildSectionStyles(tokens),
        };
      });
  }

  /**
   * Generic section data compilation.
   * NO type-specific logic - all sections compiled the same way.
   *
   * The DSL sectionId maps to resume.sections by matching:
   * - sectionTypeKey (exact match), or
   * - semanticKind (flexible match for well-known DSL IDs)
   */
  private compileSectionData(
    sectionId: string,
    resume: GenericResume,
    overrides: ItemOverride[],
    sectionTypeTitles?: Map<string, string>,
  ): SectionDataV2 {
    // Find matching section in resume data
    const section = this.findSectionForDslId(sectionId, resume.sections);

    if (!section) {
      // Special case: summary/objective come from resume root
      if (sectionId === 'summary' || sectionId === 'objective') {
        const translatedTitle =
          sectionTypeTitles?.get(`${sectionId}_v1`) ?? sectionTypeTitles?.get(sectionId);
        return {
          semanticKind: sectionId.toUpperCase(),
          sectionTypeKey: sectionId,
          title: translatedTitle ?? sectionId.charAt(0).toUpperCase() + sectionId.slice(1),
          content: resume.summary ?? '',
        };
      }
      return getPlaceholderData(sectionId, sectionTypeTitles);
    }

    // Summary/objective sections: render as text section, not item section
    if (section.semanticKind === 'SUMMARY' || section.semanticKind === 'OBJECTIVE') {
      const textContent =
        resume.summary ??
        (section.items[0]?.content as Record<string, unknown>)?.text ??
        '';
      return {
        semanticKind: section.semanticKind,
        sectionTypeKey: section.sectionTypeKey,
        title: section.title,
        content: String(textContent),
      };
    }

    // Generic compilation - filter visible items
    const visibleItems = section.items
      .filter((item) => isItemVisible(item.id, overrides))
      .map((item) => ({
        id: item.id,
        content: item.content,
      }));

    return {
      semanticKind: section.semanticKind,
      sectionTypeKey: section.sectionTypeKey,
      title: section.titleOverride || section.title,
      items: visibleItems,
    };
  }

  /**
   * Find a resume section matching a DSL section ID.
   * Matches by sectionTypeKey or inferred semanticKind.
   */
  private findSectionForDslId(
    dslSectionId: string,
    sections: GenericResumeSection[],
  ): GenericResumeSection | undefined {
    // Direct match by sectionTypeKey
    const direct = sections.find((s) => s.sectionTypeKey === dslSectionId);
    if (direct) return direct;

    // Match by section ID pattern (e.g., 'experience' matches any WORK_EXPERIENCE section)
    // This allows legacy DSL files to work with new generic resume data
    return sections.find((s) => {
      const key = s.sectionTypeKey.toLowerCase();
      const kind = s.semanticKind.toLowerCase().replace(/_/g, '');
      const id = dslSectionId.toLowerCase();

      return (
        key.includes(id) || kind.includes(id.replace(/_/g, '')) || id.includes(key.split('_')[0])
      );
    });
  }
}
