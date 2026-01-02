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
import type {
  ResumeDsl,
  ResumeAst,
  SectionData,
  ExperienceItem,
  EducationItem,
  SkillItem,
  LanguageItem,
  ProjectItem,
  CertificationItem,
  AwardItem,
  ReferenceItem,
  InterestItem,
} from '@octopus-synapse/profile-contracts';
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

@Injectable()
export class DslCompilerService {
  constructor(
    private validator: DslValidatorService,
    private tokenResolver: TokenResolverService,
  ) {}

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
    // 1. Validate
    const validatedDsl = this.validator.validateOrThrow(dsl);

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

      // Compile section data if resume data is available
      let data: SectionData;
      if (resumeData) {
        const overrides = dsl.itemOverrides?.[section.id] ?? [];
        const compiledData = this.compileSectionData(
          section.id,
          resumeData,
          overrides,
        );
        data = compiledData ?? this.getPlaceholderData(section.id);
      } else {
        data = this.getPlaceholderData(section.id);
      }

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

  private compileSectionData(
    sectionId: string,
    resume: ResumeWithRelations,
    overrides: { itemId: string; visible?: boolean; order?: number }[],
  ): SectionData | undefined {
    const applyOverrides = <T extends { id: string; order: number }>(
      items: T[],
    ): T[] => {
      return items
        .filter((item) => {
          const override = overrides.find((o) => o.itemId === item.id);
          return override?.visible !== false;
        })
        .map((item) => {
          const override = overrides.find((o) => o.itemId === item.id);
          if (override?.order !== undefined) {
            return { ...item, order: override.order };
          }
          return item;
        })
        .sort((a, b) => a.order - b.order);
    };

    switch (sectionId) {
      case 'experience': {
        const items = applyOverrides(resume.experiences).map(
          (exp): ExperienceItem => ({
            id: exp.id,
            title: exp.position,
            company: exp.company,
            location: exp.location ? { city: exp.location } : undefined,
            dateRange: {
              startDate: exp.startDate.toISOString(),
              endDate: exp.endDate?.toISOString(),
              isCurrent: exp.isCurrent,
            },
            description: exp.description ?? undefined,
            achievements: [],
            skills: exp.skills,
          }),
        );
        return { type: 'experience', items };
      }
      case 'education': {
        const items = applyOverrides(resume.education).map(
          (edu): EducationItem => ({
            id: edu.id,
            institution: edu.institution,
            degree: edu.degree,
            fieldOfStudy: edu.field,
            location: edu.location ? { city: edu.location } : undefined,
            dateRange: {
              startDate: edu.startDate.toISOString(),
              endDate: edu.endDate?.toISOString(),
              isCurrent: edu.isCurrent,
            },
            grade: edu.gpa ?? undefined,
            activities: [],
          }),
        );
        return { type: 'education', items };
      }
      case 'skills': {
        const items = applyOverrides(resume.skills).map(
          (skill): SkillItem => ({
            id: skill.id,
            name: skill.name,
            level: this.mapSkillLevel(skill.level),
            category: skill.category,
          }),
        );
        return { type: 'skills', items };
      }
      case 'languages': {
        const items = applyOverrides(resume.languages).map(
          (lang): LanguageItem => ({
            id: lang.id,
            name: lang.name,
            proficiency: lang.level,
          }),
        );
        return { type: 'languages', items };
      }
      case 'projects': {
        const items = applyOverrides(resume.projects).map(
          (proj): ProjectItem => ({
            id: proj.id,
            name: proj.name,
            description: proj.description ?? undefined,
            url: proj.url ?? undefined,
            dateRange: proj.startDate
              ? {
                  startDate: proj.startDate.toISOString(),
                  endDate: proj.endDate?.toISOString(),
                  isCurrent: proj.isCurrent,
                }
              : undefined,
            technologies: proj.technologies,
            highlights: [],
          }),
        );
        return { type: 'projects', items };
      }
      case 'certifications': {
        const items = applyOverrides(resume.certifications).map(
          (cert): CertificationItem => ({
            id: cert.id,
            name: cert.name,
            issuer: cert.issuer,
            date: cert.issueDate.toISOString(),
            url: cert.credentialUrl ?? undefined,
          }),
        );
        return { type: 'certifications', items };
      }
      case 'awards': {
        const items = applyOverrides(resume.awards).map(
          (award): AwardItem => ({
            id: award.id,
            title: award.title,
            issuer: award.issuer,
            date: award.date.toISOString(),
            description: award.description ?? undefined,
          }),
        );
        return { type: 'awards', items };
      }
      case 'interests': {
        const items = applyOverrides(resume.interests).map(
          (int): InterestItem => ({
            id: int.id,
            name: int.name,
            keywords: int.description ? [int.description] : [],
          }),
        );
        return { type: 'interests', items };
      }
      case 'references': {
        const items = applyOverrides(resume.recommendations).map(
          (rec): ReferenceItem => ({
            id: rec.id,
            name: rec.author,
            role: rec.position ?? '',
            company: rec.company ?? undefined,
          }),
        );
        return { type: 'references', items };
      }
      case 'summary': {
        return {
          type: 'summary',
          data: { content: resume.summary ?? '' },
        };
      }
      default:
        return undefined;
    }
  }

  private mapSkillLevel(level: number | null): string | undefined {
    if (level === null) return undefined;
    if (level >= 5) return 'Expert';
    if (level >= 4) return 'Advanced';
    if (level >= 3) return 'Intermediate';
    if (level >= 2) return 'Elementary';
    return 'Beginner';
  }

  private getPlaceholderData(sectionId: string): SectionData {
    switch (sectionId) {
      case 'experience':
        return { type: 'experience', items: [] };
      case 'education':
        return { type: 'education', items: [] };
      case 'skills':
        return { type: 'skills', items: [] };
      case 'languages':
        return { type: 'languages', items: [] };
      case 'projects':
        return { type: 'projects', items: [] };
      case 'certifications':
        return { type: 'certifications', items: [] };
      case 'awards':
        return { type: 'awards', items: [] };
      case 'interests':
        return { type: 'interests', items: [] };
      case 'references':
        return { type: 'references', items: [] };
      case 'summary':
        return { type: 'summary', data: { content: '' } };
      case 'objective':
        return { type: 'objective', data: { content: '' } };
      case 'volunteer':
        return { type: 'volunteer', items: [] };
      case 'publications':
        return { type: 'publications', items: [] };
      default:
        return { type: 'custom', items: [] };
    }
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
