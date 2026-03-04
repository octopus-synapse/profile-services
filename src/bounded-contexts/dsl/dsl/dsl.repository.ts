import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ResumeAst, ResumeDsl } from '@/shared-kernel';
import type { GenericResume, GenericResumeSection, SemanticKind } from '@/shared-kernel/types';
import { mergeDsl } from '../domain/value-objects/merge-dsl';
import { RESUME_RELATIONS_INCLUDE } from '../infrastructure/resume-query';
import { DslCompilerService } from './dsl-compiler.service';
import { DslValidatorService } from './dsl-validator.service';

type RenderTarget = 'html' | 'pdf';

@Injectable()
export class DslRepository {
  private readonly logger = new Logger(DslRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly compiler: DslCompilerService,
    private readonly validator: DslValidatorService,
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
  ): Promise<{ ast: ResumeAst; resumeId: string }> {
    this.logger.log(`Rendering resume ${resumeId} for user ${userId}`);
    const resume = await this.fetchResumeWithData(resumeId, userId);
    const mergedDsl = this.buildMergedDsl(resume);
    const ast = this.compileWithResumeData(mergedDsl, resume, target);
    return { ast, resumeId };
  }

  async renderPublic(
    slug: string,
    target: RenderTarget = 'html',
  ): Promise<{ ast: ResumeAst; slug: string }> {
    this.logger.log(`Rendering public resume: ${slug}`);
    const share = await this.prisma.resumeShare.findUnique({
      where: { slug },
      include: {
        resume: {
          include: RESUME_RELATIONS_INCLUDE,
        },
      },
    });

    if (!share || !share.isActive) {
      throw new BadRequestException('Resume not found or not public');
    }

    if (share.expiresAt && new Date() > share.expiresAt) {
      throw new BadRequestException('Resume not found or not public');
    }

    const normalizedResume = this.normalizeToGenericResume(share.resume);
    const mergedDsl = this.buildMergedDsl(normalizedResume);
    const ast = this.compileWithResumeData(mergedDsl, normalizedResume, target);
    return { ast, slug };
  }

  private async fetchResumeWithData(resumeId: string, userId: string): Promise<GenericResume> {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId },
      include: RESUME_RELATIONS_INCLUDE,
    });

    if (!resume) {
      throw new BadRequestException('Resume not found');
    }

    return this.normalizeToGenericResume(resume);
  }

  /**
   * Normalizes Prisma resume to GenericResume format.
   * This is the single canonical transformation point.
   */
  private normalizeToGenericResume(resume: {
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
  }): GenericResume {
    const sections: GenericResumeSection[] = (resume.resumeSections ?? [])
      .filter((section) => section.isVisible)
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        id: section.id,
        resumeId: resume.id,
        sectionTypeId: section.sectionTypeId,
        sectionTypeKey: section.sectionType.key,
        semanticKind: section.sectionType.semanticKind as SemanticKind,
        title: section.sectionType.title,
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
      }));

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
    const baseDsl = (resume.activeTheme?.styleConfig ?? {}) as Record<string, unknown>;
    const customDsl = (resume.customTheme ?? {}) as Record<string, unknown>;
    return mergeDsl(baseDsl, customDsl);
  }

  private compileWithResumeData(
    mergedDsl: Record<string, unknown>,
    resumeData: GenericResume,
    target: RenderTarget,
  ): ResumeAst {
    const validatedDsl = this.validator.validateOrThrow(mergedDsl as ResumeDsl);
    return target === 'html'
      ? this.compiler.compileForHtml(validatedDsl, resumeData)
      : this.compiler.compileForPdf(validatedDsl, resumeData);
  }
}
