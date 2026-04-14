import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ResumeAst } from '@/bounded-contexts/dsl/domain/schemas/ast/resume-ast.schema';
import type { ResumeDsl } from '@/bounded-contexts/dsl/domain/schemas/dsl';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  EntityNotFoundException,
  ValidationException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import type {
  GenericResume,
  GenericResumeSection,
  SemanticKind,
} from '@/shared-kernel/schemas/sections';
import {
  DEFAULT_LOCALE,
  resolveTranslation,
  type SupportedLocale,
  type TranslationsJson,
} from '@/shared-kernel/utils/locale-resolver';
import { mergeDsl } from './domain/value-objects/merge-dsl';
import { DslCompilerService } from './dsl-compiler.service';
import { DslValidatorService } from './dsl-validator.service';
import { RESUME_RELATIONS_INCLUDE } from './infrastructure/resume-query';

type RenderTarget = 'html' | 'pdf';

type PrismaResumeData = {
  id: string;
  userId: string;
  title?: string | null;
  summary?: string | null;
  fullName?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  emailContact?: string | null;
  location?: string | null;
  linkedin?: string | null;
  github?: string | null;
  website?: string | null;
  activeTheme?: { id: string; name: string; styleConfig: unknown } | null;
  customTheme?: unknown;
  createdAt: Date;
  updatedAt: Date;
  resumeSections?: Array<{
    id: string;
    sectionTypeId: string;
    titleOverride: string | null;
    isVisible: boolean;
    order: number;
    sectionType: {
      key: string;
      title: string;
      semanticKind: string;
      translations: unknown;
    };
    items: Array<{
      id: string;
      order: number;
      isVisible: boolean;
      content: unknown;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }>;
};

type SectionTypeData = {
  key: string;
  title: string;
  translations: unknown;
};

type DslPrismaPort = {
  resume: {
    findFirst: (args: {
      where: { id: string; userId: string };
      include: typeof RESUME_RELATIONS_INCLUDE;
    }) => Promise<PrismaResumeData | null>;
  };
  resumeShare: {
    findUnique: (args: {
      where: { slug: string };
      include: {
        resume: {
          include: typeof RESUME_RELATIONS_INCLUDE;
        };
      };
    }) => Promise<{
      isActive: boolean;
      expiresAt: Date | null;
      resume: PrismaResumeData;
    } | null>;
  };
  sectionType: {
    findMany: (args: {
      where: { isActive: boolean };
      select: { key: true; title: true; translations: true };
    }) => Promise<SectionTypeData[]>;
  };
};
type DslCompilerPort = Pick<
  DslCompilerService,
  'compileFromRaw' | 'compileForHtml' | 'compileForPdf'
>;
type DslValidatorPort = {
  validate: (dsl: unknown) => {
    valid: boolean;
    errors?: unknown[] | null;
  };
  validateOrThrow: (dsl: unknown) => ResumeDsl;
};

@Injectable()
export class DslRepository {
  private readonly logger = new Logger(DslRepository.name);

  constructor(
    @Inject(PrismaService)
    private readonly prisma: DslPrismaPort,
    @Inject(DslCompilerService)
    private readonly compiler: DslCompilerPort,
    @Inject(DslValidatorService)
    private readonly validator: DslValidatorPort,
  ) {}

  preview(dsl: unknown, target: RenderTarget = 'html'): ResumeAst {
    this.logger.log(`Previewing DSL for target: ${target}`);
    return this.compiler.compileFromRaw(dsl, target);
  }

  validate(dsl: unknown): { valid: boolean; errors: unknown[] | null } {
    const result = this.validator.validate(dsl);
    return { valid: result.valid, errors: result.errors ?? null };
  }

  async render(
    resumeId: string,
    userId: string,
    target: RenderTarget = 'html',
    locale: SupportedLocale = DEFAULT_LOCALE,
    themeStyleConfig?: Record<string, unknown>,
  ): Promise<{ ast: ResumeAst; resumeId: string }> {
    this.logger.log(`Rendering resume ${resumeId} for user ${userId} with locale ${locale}`);
    const [resume, sectionTypeTitles] = await Promise.all([
      this.fetchResumeWithData(resumeId, userId, locale),
      this.fetchSectionTypeTitles(locale),
    ]);
    const mergedDsl = themeStyleConfig
      ? mergeDsl(themeStyleConfig, (resume.customTheme ?? {}) as Record<string, unknown>)
      : this.buildMergedDsl(resume);
    const ast = this.compileWithResumeData(mergedDsl, resume, target, sectionTypeTitles);
    return { ast, resumeId };
  }

  async renderPublic(
    slug: string,
    target: RenderTarget = 'html',
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<{ ast: ResumeAst; slug: string }> {
    this.logger.log(`Rendering public resume: ${slug} with locale ${locale}`);
    const [share, sectionTypeTitles] = await Promise.all([
      this.prisma.resumeShare.findUnique({
        where: { slug },
        include: {
          resume: {
            include: RESUME_RELATIONS_INCLUDE,
          },
        },
      }),
      this.fetchSectionTypeTitles(locale),
    ]);

    if (!share?.isActive) {
      throw new EntityNotFoundException('ResumeShare', slug);
    }

    if (share.expiresAt && new Date() > share.expiresAt) {
      throw new EntityNotFoundException('ResumeShare', slug);
    }

    const normalizedResume = this.normalizeToGenericResume(share.resume, locale);
    const mergedDsl = this.buildMergedDsl(normalizedResume);
    const ast = this.compileWithResumeData(mergedDsl, normalizedResume, target, sectionTypeTitles);
    return { ast, slug };
  }

  private async fetchResumeWithData(
    resumeId: string,
    userId: string,
    locale: SupportedLocale,
  ): Promise<GenericResume> {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId },
      include: RESUME_RELATIONS_INCLUDE,
    });

    if (!resume) {
      throw new EntityNotFoundException('Resume', resumeId);
    }

    return this.normalizeToGenericResume(resume, locale);
  }

  /**
   * Normalizes Prisma resume to GenericResume format.
   * This is the single canonical transformation point.
   */
  private normalizeToGenericResume(
    resume: PrismaResumeData,
    locale: SupportedLocale,
  ): GenericResume {
    const sections: GenericResumeSection[] = (resume.resumeSections ?? [])
      .filter((section) => section.isVisible)
      .sort((a, b) => a.order - b.order)
      .map((section) => {
        // Resolve translated title from sectionType.translations
        const translations = section.sectionType.translations as TranslationsJson | null;
        const resolved = resolveTranslation(translations, locale);
        const resolvedTitle = resolved.title || section.sectionType.title;

        return {
          id: section.id,
          resumeId: resume.id,
          sectionTypeId: section.sectionTypeId,
          sectionTypeKey: section.sectionType.key,
          semanticKind: section.sectionType.semanticKind as SemanticKind,
          title: resolvedTitle,
          titleOverride: section.titleOverride,
          isVisible: section.isVisible,
          order: section.order,
          items: section.items
            .filter((item) => item.isVisible)
            .sort((a, b) => a.order - b.order)
            .map((item) => ({
              id: item.id,
              order: item.order,
              isVisible: item.isVisible,
              content: this.asRecord(item.content),
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            })),
        };
      });

    return {
      id: resume.id,
      userId: resume.userId,
      title: resume.title ?? null,
      summary: resume.summary ?? null,
      fullName: resume.fullName ?? null,
      jobTitle: resume.jobTitle ?? null,
      phone: resume.phone ?? null,
      emailContact: resume.emailContact ?? null,
      location: resume.location ?? null,
      linkedin: resume.linkedin ?? null,
      github: resume.github ?? null,
      website: resume.website ?? null,
      sections,
      activeTheme: resume.activeTheme ?? null,
      customTheme: resume.customTheme,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    };
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private buildMergedDsl(resume: GenericResume): Record<string, unknown> {
    const baseDsl = resume.activeTheme?.styleConfig;

    if (!baseDsl || Object.keys(baseDsl as object).length === 0) {
      throw new ValidationException(
        'Resume has no active theme. Please apply a theme before rendering.',
      );
    }

    const customDsl = (resume.customTheme ?? {}) as Record<string, unknown>;
    return mergeDsl(baseDsl as Record<string, unknown>, customDsl);
  }

  private compileWithResumeData(
    mergedDsl: Record<string, unknown>,
    resumeData: GenericResume,
    target: RenderTarget,
    sectionTypeTitles?: Map<string, string>,
  ): ResumeAst {
    const validatedDsl = this.validator.validateOrThrow(mergedDsl as ResumeDsl);
    return target === 'html'
      ? this.compiler.compileForHtml(validatedDsl, resumeData, sectionTypeTitles)
      : this.compiler.compileForPdf(validatedDsl, resumeData, sectionTypeTitles);
  }

  /**
   * Fetches all active section types and resolves their titles for the given locale.
   * Returns a Map of sectionTypeKey → translatedTitle.
   */
  private async fetchSectionTypeTitles(locale: SupportedLocale): Promise<Map<string, string>> {
    const sectionTypes = await this.prisma.sectionType.findMany({
      where: { isActive: true },
      select: { key: true, title: true, translations: true },
    });

    const map = new Map<string, string>();
    for (const st of sectionTypes) {
      const translations = st.translations as TranslationsJson | null;
      const resolved = resolveTranslation(translations, locale);
      map.set(st.key, resolved.title || st.title);
    }
    return map;
  }
}
