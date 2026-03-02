/**
 * DSL Compiler Service
 *
 * Compiles Resume DSL into Resume AST for rendering.
 * Uses generic sections exclusively - no legacy bucket arrays.
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
  getString,
  mapSkillLevelToString,
  projectAward,
  projectCertification,
  projectEducation,
  projectExperience,
  projectInterest,
  projectItemsByKind,
  projectLanguage,
  projectProject,
  projectRecommendation,
  projectSkill,
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
   * Maps DSL section IDs to semantic kinds and projects to AST format.
   */
  private compileSectionData(
    sectionId: string,
    resume: GenericResume,
    overrides: ItemOverride[],
  ): SectionData {
    switch (sectionId) {
      case 'experience':
        return this.compileExperiences(resume.sections, overrides);
      case 'education':
        return this.compileEducation(resume.sections, overrides);
      case 'skills':
        return this.compileSkills(resume.sections, overrides);
      case 'languages':
        return this.compileLanguages(resume.sections, overrides);
      case 'projects':
        return this.compileProjects(resume.sections, overrides);
      case 'certifications':
        return this.compileCertifications(resume.sections, overrides);
      case 'awards':
        return this.compileAwards(resume.sections, overrides);
      case 'interests':
        return this.compileInterests(resume.sections, overrides);
      case 'references':
        return this.compileReferences(resume.sections, overrides);
      case 'publications':
        return this.compilePublications(resume.sections, overrides);
      case 'summary':
        return { type: 'summary', data: { content: resume.summary ?? '' } };
      default:
        return getPlaceholderData(sectionId);
    }
  }

  private compileExperiences(
    sections: GenericResumeSection[],
    overrides: ItemOverride[],
  ): SectionData {
    const items = projectItemsByKind(sections, 'WORK_EXPERIENCE', projectExperience)
      .filter((item) => this.isItemVisible(item.id, overrides))
      .map(
        (exp): ExperienceItem => ({
          id: exp.id,
          title: exp.role,
          company: exp.company,
          location: exp.location ? { city: exp.location } : undefined,
          dateRange: {
            startDate: exp.startDate.toISOString(),
            endDate: exp.endDate?.toISOString(),
            isCurrent: exp.isCurrent,
          },
          description: exp.description ?? undefined,
          achievements: exp.achievements,
          skills: [],
        }),
      );

    return { type: 'experience', items };
  }

  private compileEducation(
    sections: GenericResumeSection[],
    overrides: ItemOverride[],
  ): SectionData {
    const items = projectItemsByKind(sections, 'EDUCATION', projectEducation)
      .filter((item) => this.isItemVisible(item.id, overrides))
      .map(
        (edu): EducationItem => ({
          id: edu.id,
          institution: edu.institution,
          degree: edu.degree,
          fieldOfStudy: edu.field ?? '',
          location: edu.location ? { city: edu.location } : undefined,
          dateRange: {
            startDate: edu.startDate?.toISOString() ?? '',
            endDate: edu.endDate?.toISOString(),
            isCurrent: edu.isCurrent,
          },
          grade: edu.gpa ?? undefined,
          activities: [],
        }),
      );

    return { type: 'education', items };
  }

  private compileSkills(sections: GenericResumeSection[], overrides: ItemOverride[]): SectionData {
    const items = projectItemsByKind(sections, 'SKILL_SET', projectSkill)
      .filter((item) => this.isItemVisible(item.id, overrides))
      .filter((skill) => skill.name.length > 0)
      .map(
        (skill): SkillItem => ({
          id: skill.id,
          name: skill.name,
          level: skill.level ? mapSkillLevelToString(skill.level) : undefined,
          category: skill.category ?? undefined,
        }),
      );

    return { type: 'skills', items };
  }

  private compileLanguages(
    sections: GenericResumeSection[],
    overrides: ItemOverride[],
  ): SectionData {
    const items = projectItemsByKind(sections, 'LANGUAGE', projectLanguage)
      .filter((item) => this.isItemVisible(item.id, overrides))
      .filter((lang) => lang.name.length > 0)
      .map(
        (lang): LanguageItem => ({
          id: lang.id,
          name: lang.name,
          proficiency: lang.level,
        }),
      );

    return { type: 'languages', items };
  }

  private compileProjects(
    sections: GenericResumeSection[],
    overrides: ItemOverride[],
  ): SectionData {
    const items = projectItemsByKind(sections, 'PROJECT', projectProject)
      .filter((item) => this.isItemVisible(item.id, overrides))
      .filter((proj) => proj.name.length > 0)
      .map(
        (proj): ProjectItem => ({
          id: proj.id,
          name: proj.name,
          dateRange: proj.startDate
            ? {
                startDate: proj.startDate.toISOString(),
                endDate: proj.endDate?.toISOString(),
                isCurrent: proj.isCurrent,
              }
            : undefined,
          url: proj.url ?? undefined,
          repositoryUrl: proj.repositoryUrl ?? undefined,
          description: proj.description ?? undefined,
          highlights: [],
          technologies: proj.technologies,
        }),
      );

    return { type: 'projects', items };
  }

  private compileCertifications(
    sections: GenericResumeSection[],
    overrides: ItemOverride[],
  ): SectionData {
    const items = projectItemsByKind(sections, 'CERTIFICATION', projectCertification)
      .filter((item) => this.isItemVisible(item.id, overrides))
      .filter((cert) => cert.name.length > 0)
      .map(
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

  private compileAwards(sections: GenericResumeSection[], overrides: ItemOverride[]): SectionData {
    const items = projectItemsByKind(sections, 'AWARD', projectAward)
      .filter((item) => this.isItemVisible(item.id, overrides))
      .map(
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

  private compileInterests(
    sections: GenericResumeSection[],
    overrides: ItemOverride[],
  ): SectionData {
    const items = projectItemsByKind(sections, 'INTEREST', projectInterest)
      .filter((item) => this.isItemVisible(item.id, overrides))
      .map(
        (interest): InterestItem => ({
          id: interest.id,
          name: interest.name,
          keywords: interest.keywords,
        }),
      );

    return { type: 'interests', items };
  }

  private compileReferences(
    sections: GenericResumeSection[],
    overrides: ItemOverride[],
  ): SectionData {
    const items = projectItemsByKind(sections, 'RECOMMENDATION', projectRecommendation)
      .filter((item) => this.isItemVisible(item.id, overrides))
      .map(
        (rec): ReferenceItem => ({
          id: rec.id,
          name: rec.author,
          role: rec.role ?? '',
          company: rec.company ?? undefined,
        }),
      );

    return { type: 'references', items };
  }

  private compilePublications(
    sections: GenericResumeSection[],
    overrides: ItemOverride[],
  ): SectionData {
    const items = projectItemsByKind(sections, 'PUBLICATION', (item) => ({
      id: item.id,
      order: item.order,
      title: getString(item.content, 'title') ?? '',
      publisher: getString(item.content, 'publisher') ?? '',
      date: item.content.date ? new Date(item.content.date as string) : null,
      url: getString(item.content, 'url'),
      description: getString(item.content, 'description'),
    }))
      .filter((item) => this.isItemVisible(item.id, overrides))
      .map(
        (pub): PublicationItem => ({
          id: pub.id,
          title: pub.title,
          publisher: pub.publisher,
          date: pub.date?.toISOString() ?? '',
          url: pub.url ?? undefined,
          description: pub.description ?? undefined,
        }),
      );

    return { type: 'publications', items };
  }

  private isItemVisible(itemId: string, overrides: ItemOverride[]): boolean {
    const override = overrides.find((o) => o.itemId === itemId);
    return override?.visible !== false;
  }
}
