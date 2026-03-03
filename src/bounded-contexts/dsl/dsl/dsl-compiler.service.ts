/**
 * DSL Compiler Service
 *
 * Compiles Resume DSL into Resume AST for rendering.
 * Uses generic sections exclusively - no legacy bucket arrays.
 *
 * Architecture:
 *   - A SECTION_COMPILERS registry maps sectionId → compiler function.
 *   - Well-known section types (experience, education, etc.) have typed compilers.
 *   - Unknown/custom section types use a generic fallback compiler.
 *   - Adding a new section type requires ZERO code changes here — the generic
 *     compiler reads fields from content and produces a generic AST node.
 */

import { Injectable } from '@nestjs/common';
import type { ResumeAst, ResumeDsl } from '@/shared-kernel';
import type {
  AwardItem,
  CertificationItem,
  EducationItem,
  ExperienceItem,
  InterestItem,
  LanguageItem,
  ProjectItem,
  PublicationItem,
  ReferenceItem,
  SectionData,
  SkillItem,
} from '@/shared-kernel/ast/section-data.schema';
import type { GenericResume, GenericResumeSection } from '@/shared-kernel/types';
import {
  getBoolean,
  getDate,
  getNumber,
  getString,
  getStringArray,
  getStringRequired,
  getVisibleItemsByKind,
  mapSkillLevelToString,
} from '@/shared-kernel/types/section-projection.adapter';
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

// ============================================================================
// Section Compiler Registry
// ============================================================================

type SectionCompilerFn = (
  sections: GenericResumeSection[],
  overrides: ItemOverride[],
  resume: GenericResume,
) => SectionData;

/**
 * Registry entry: maps a DSL sectionId to its semantic kind and compiler.
 */
interface SectionCompilerEntry {
  kind: string;
  compile: SectionCompilerFn;
}

function isItemVisible(itemId: string, overrides: ItemOverride[]): boolean {
  const override = overrides.find((o) => o.itemId === itemId);
  return override?.visible !== false;
}

/**
 * Well-known section compilers — backward-compatible typed AST output.
 */
const SECTION_COMPILERS: Record<string, SectionCompilerEntry> = {
  experience: {
    kind: 'WORK_EXPERIENCE',
    compile: (sections, overrides) => {
      const items = getVisibleItemsByKind(sections, 'WORK_EXPERIENCE')
        .filter((item) => isItemVisible(item.id, overrides))
        .map((item): ExperienceItem => {
          const c = item.content;
          const endDate = getDate(c, 'endDate');
          return {
            id: item.id,
            title: getStringRequired(c, 'role') || getStringRequired(c, 'position'),
            company: getStringRequired(c, 'company'),
            location: getString(c, 'location')
              ? { city: getString(c, 'location') ?? '' }
              : undefined,
            dateRange: {
              startDate: (getDate(c, 'startDate') ?? new Date()).toISOString(),
              endDate: endDate?.toISOString(),
              isCurrent: getBoolean(c, 'isCurrent') ?? !endDate,
            },
            description: getString(c, 'description') ?? undefined,
            achievements: getStringArray(c, 'achievements'),
            skills: [],
          };
        });
      return { type: 'experience', items };
    },
  },

  education: {
    kind: 'EDUCATION',
    compile: (sections, overrides) => {
      const items = getVisibleItemsByKind(sections, 'EDUCATION')
        .filter((item) => isItemVisible(item.id, overrides))
        .map((item): EducationItem => {
          const c = item.content;
          const endDate = getDate(c, 'endDate');
          return {
            id: item.id,
            institution: getStringRequired(c, 'institution'),
            degree: getStringRequired(c, 'degree'),
            fieldOfStudy: getString(c, 'field') || getString(c, 'fieldOfStudy') || '',
            location: getString(c, 'location')
              ? { city: getString(c, 'location') ?? '' }
              : undefined,
            dateRange: {
              startDate: getDate(c, 'startDate')?.toISOString() ?? '',
              endDate: endDate?.toISOString(),
              isCurrent: getBoolean(c, 'isCurrent') ?? !endDate,
            },
            grade: getString(c, 'gpa') || getString(c, 'grade') || undefined,
            activities: [],
          };
        });
      return { type: 'education', items };
    },
  },

  skills: {
    kind: 'SKILL_SET',
    compile: (sections, overrides) => {
      const items = getVisibleItemsByKind(sections, 'SKILL_SET')
        .filter((item) => isItemVisible(item.id, overrides))
        .filter((item) => getStringRequired(item.content, 'name').length > 0)
        .map((item): SkillItem => {
          const c = item.content;
          const level = getNumber(c, 'level');
          return {
            id: item.id,
            name: getStringRequired(c, 'name'),
            level: level ? mapSkillLevelToString(level) : undefined,
            category: getString(c, 'category') ?? undefined,
          };
        });
      return { type: 'skills', items };
    },
  },

  languages: {
    kind: 'LANGUAGE',
    compile: (sections, overrides) => {
      const items = getVisibleItemsByKind(sections, 'LANGUAGE')
        .filter((item) => isItemVisible(item.id, overrides))
        .filter((item) => getStringRequired(item.content, 'name').length > 0)
        .map(
          (item): LanguageItem => ({
            id: item.id,
            name: getStringRequired(item.content, 'name'),
            proficiency: getStringRequired(item.content, 'level', 'BASIC'),
          }),
        );
      return { type: 'languages', items };
    },
  },

  projects: {
    kind: 'PROJECT',
    compile: (sections, overrides) => {
      const items = getVisibleItemsByKind(sections, 'PROJECT')
        .filter((item) => isItemVisible(item.id, overrides))
        .filter((item) => getStringRequired(item.content, 'name').length > 0)
        .map((item): ProjectItem => {
          const c = item.content;
          return {
            id: item.id,
            name: getStringRequired(c, 'name'),
            dateRange: getDate(c, 'startDate')
              ? {
                  startDate: getDate(c, 'startDate')?.toISOString() ?? '',
                  endDate: getDate(c, 'endDate')?.toISOString(),
                  isCurrent: getBoolean(c, 'isCurrent') ?? false,
                }
              : undefined,
            url: getString(c, 'url') ?? undefined,
            repositoryUrl: getString(c, 'repositoryUrl') ?? undefined,
            description: getString(c, 'description') ?? undefined,
            highlights: [],
            technologies: getStringArray(c, 'technologies'),
          };
        });
      return { type: 'projects', items };
    },
  },

  certifications: {
    kind: 'CERTIFICATION',
    compile: (sections, overrides) => {
      const items = getVisibleItemsByKind(sections, 'CERTIFICATION')
        .filter((item) => isItemVisible(item.id, overrides))
        .filter((item) => getStringRequired(item.content, 'name').length > 0)
        .map((item): CertificationItem => {
          const c = item.content;
          return {
            id: item.id,
            name: getStringRequired(c, 'name'),
            issuer: getStringRequired(c, 'issuer'),
            date: (getDate(c, 'issueDate') ?? new Date()).toISOString(),
            url: getString(c, 'credentialUrl') || getString(c, 'url') || undefined,
          };
        });
      return { type: 'certifications', items };
    },
  },

  awards: {
    kind: 'AWARD',
    compile: (sections, overrides) => {
      const items = getVisibleItemsByKind(sections, 'AWARD')
        .filter((item) => isItemVisible(item.id, overrides))
        .map((item): AwardItem => {
          const c = item.content;
          return {
            id: item.id,
            title: getStringRequired(c, 'title'),
            issuer: getStringRequired(c, 'issuer'),
            date: (getDate(c, 'date') ?? new Date()).toISOString(),
            description: getString(c, 'description') ?? undefined,
          };
        });
      return { type: 'awards', items };
    },
  },

  interests: {
    kind: 'INTEREST',
    compile: (sections, overrides) => {
      const items = getVisibleItemsByKind(sections, 'INTEREST')
        .filter((item) => isItemVisible(item.id, overrides))
        .map(
          (item): InterestItem => ({
            id: item.id,
            name: getStringRequired(item.content, 'name'),
            keywords: getStringArray(item.content, 'keywords'),
          }),
        );
      return { type: 'interests', items };
    },
  },

  references: {
    kind: 'RECOMMENDATION',
    compile: (sections, overrides) => {
      const items = getVisibleItemsByKind(sections, 'RECOMMENDATION')
        .filter((item) => isItemVisible(item.id, overrides))
        .map((item): ReferenceItem => {
          const c = item.content;
          return {
            id: item.id,
            name: getStringRequired(c, 'author') || getStringRequired(c, 'name'),
            role: getString(c, 'role') || getString(c, 'position') || '',
            company: getString(c, 'company') ?? undefined,
          };
        });
      return { type: 'references', items };
    },
  },

  publications: {
    kind: 'PUBLICATION',
    compile: (sections, overrides) => {
      const items = getVisibleItemsByKind(sections, 'PUBLICATION')
        .filter((item) => isItemVisible(item.id, overrides))
        .map((item): PublicationItem => {
          const c = item.content;
          return {
            id: item.id,
            title: getStringRequired(c, 'title'),
            publisher: getStringRequired(c, 'publisher'),
            date: getDate(c, 'date')?.toISOString() ?? '',
            url: getString(c, 'url') ?? undefined,
            description: getString(c, 'description') ?? undefined,
          };
        });
      return { type: 'publications', items };
    },
  },

  summary: {
    kind: 'SUMMARY',
    compile: (_sections, _overrides, resume) => ({
      type: 'summary',
      data: { content: resume.summary ?? '' },
    }),
  },
};

@Injectable()
export class DslCompilerService {
  constructor(
    private validator: DslValidatorService,
    private tokenResolver: TokenResolverService,
    private migrationService: DslMigrationService,
  ) {}

  compileForHtml(dsl: ResumeDsl, resumeData?: GenericResume): ResumeAst {
    return this.compile(dsl, 'html', resumeData);
  }

  compileForPdf(dsl: ResumeDsl, resumeData?: GenericResume): ResumeAst {
    return this.compile(dsl, 'pdf', resumeData);
  }

  compile(dsl: ResumeDsl, _target: 'html' | 'pdf' = 'html', resumeData?: GenericResume): ResumeAst {
    const migratedDsl = this.migrateDsl(dsl);
    const validatedDsl = this.validator.validateOrThrow(migratedDsl);
    const tokens = this.tokenResolver.resolve(validatedDsl.tokens);
    const pageLayout = buildPageLayout(validatedDsl, tokens);
    const sections = this.placeSections(validatedDsl, tokens, resumeData);

    return {
      meta: {
        version: validatedDsl.version,
        generatedAt: new Date().toISOString(),
      },
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
  ): ResumeAst['sections'] {
    return dsl.sections
      .filter((s) => s.visible)
      .sort((a, b) => a.order - b.order)
      .map((section) => {
        const overrides = (dsl.itemOverrides?.[section.id] ?? []) as ItemOverride[];
        const data = resumeData
          ? this.compileSectionData(section.id, resumeData, overrides)
          : getPlaceholderData(section.id);

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
   * Compile section data from generic resume sections.
   * Uses the SECTION_COMPILERS registry — no switch statement.
   * Unknown section IDs get placeholder data (future: generic compilation).
   */
  private compileSectionData(
    sectionId: string,
    resume: GenericResume,
    overrides: ItemOverride[],
  ): SectionData {
    const compiler = SECTION_COMPILERS[sectionId];
    if (compiler) {
      return compiler.compile(resume.sections, overrides, resume);
    }
    return getPlaceholderData(sectionId);
  }
}
