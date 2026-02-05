import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { DslCompilerService } from './dsl-compiler.service';
import { DslValidatorService } from './dsl-validator.service';
import type { ResumeDsl, ResumeAst } from '@/shared-kernel';
import type { ResumeWithRelations } from './dsl-compiler.service';
import { mergeDsl } from '../domain/value-objects/merge-dsl';
import { RESUME_RELATIONS_INCLUDE } from '../infrastructure/resume-query';

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
    const resume = await this.prisma.resume.findFirst({
      where: { slug, isPublic: true },
      include: RESUME_RELATIONS_INCLUDE,
    });

    if (!resume) {
      throw new BadRequestException('Resume not found or not public');
    }

    const mergedDsl = this.buildMergedDsl(resume as ResumeWithRelations);
    const ast = this.compileWithResumeData(
      mergedDsl,
      resume as ResumeWithRelations,
      target,
    );
    return { ast, slug };
  }

  private async fetchResumeWithData(
    resumeId: string,
    userId: string,
  ): Promise<ResumeWithRelations> {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId },
      include: RESUME_RELATIONS_INCLUDE,
    });

    if (!resume) {
      throw new BadRequestException('Resume not found');
    }

    return resume as ResumeWithRelations;
  }

  private buildMergedDsl(resume: ResumeWithRelations): Record<string, unknown> {
    const baseDsl = (resume.activeTheme?.styleConfig ?? {}) as Record<
      string,
      unknown
    >;
    const customDsl = (resume.customTheme ?? {}) as Record<string, unknown>;
    return mergeDsl(baseDsl, customDsl);
  }

  private compileWithResumeData(
    mergedDsl: Record<string, unknown>,
    resumeData: ResumeWithRelations,
    target: RenderTarget,
  ): ResumeAst {
    const validatedDsl = this.validator.validateOrThrow(mergedDsl as ResumeDsl);
    return target === 'html'
      ? this.compiler.compileForHtml(validatedDsl, resumeData)
      : this.compiler.compileForPdf(validatedDsl, resumeData);
  }
}
