import { Injectable } from '@nestjs/common';
import type { ResumeAst, ResumeDsl, SectionData } from '@/shared-kernel';
import {
  buildPageLayout,
  buildSectionStyles,
  compileAwards,
  compileCertifications,
  compileEducation,
  compileExperience,
  compileInterests,
  compileLanguages,
  compileProjects,
  compileReferences,
  compileSkills,
  getPlaceholderData,
  type ItemOverride,
  mapColumnToId,
} from '../application/compilers';
import { type ResumeWithRelations } from '../domain/value-objects/resume-with-relations';
import { DslValidatorService } from './dsl-validator.service';
import { DslMigrationService } from './migrators';
import { type ResolvedTokens, TokenResolverService } from './token-resolver.service';

export type { ResumeWithRelations };

const CURRENT_DSL_VERSION = '1.0.0';

@Injectable()
export class DslCompilerService {
  constructor(
    private validator: DslValidatorService,
    private tokenResolver: TokenResolverService,
    private migrationService: DslMigrationService,
  ) {}

  compileForHtml(dsl: ResumeDsl, resumeData?: ResumeWithRelations): ResumeAst {
    return this.compile(dsl, 'html', resumeData);
  }

  compileForPdf(dsl: ResumeDsl, resumeData?: ResumeWithRelations): ResumeAst {
    return this.compile(dsl, 'pdf', resumeData);
  }

  compile(
    dsl: ResumeDsl,
    _target: 'html' | 'pdf' = 'html',
    resumeData?: ResumeWithRelations,
  ): ResumeAst {
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
    resumeData?: ResumeWithRelations,
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

  private compileSectionData(
    sectionId: string,
    resume: ResumeWithRelations,
    overrides: ItemOverride[],
  ): SectionData {
    switch (sectionId) {
      case 'experience':
        return compileExperience(resume.experiences, overrides);
      case 'education':
        return compileEducation(resume.education, overrides);
      case 'skills':
        return compileSkills(resume.skills, overrides);
      case 'languages':
        return compileLanguages(resume.languages, overrides);
      case 'projects':
        return compileProjects(resume.projects, overrides);
      case 'certifications':
        return compileCertifications(resume.certifications, overrides);
      case 'awards':
        return compileAwards(resume.awards, overrides);
      case 'interests':
        return compileInterests(resume.interests, overrides);
      case 'references':
        return compileReferences(resume.recommendations, overrides);
      case 'summary':
        return { type: 'summary', data: { content: resume.summary ?? '' } };
      default:
        return getPlaceholderData(sectionId);
    }
  }
}
