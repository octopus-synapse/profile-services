/**
 * DSL Repository
 * Business logic layer for DSL operations
 * Follows NestJS Repository pattern
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DslCompilerService } from './dsl-compiler.service';
import { DslValidatorService } from './dsl-validator.service';
import type { ResumeDsl, ResumeAst } from '@octopus-synapse/profile-contracts';
import type { ResumeWithRelations } from './dsl-compiler.service';

type RenderTarget = 'html' | 'pdf';

@Injectable()
export class DslRepository {
  private readonly logger = new Logger(DslRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly compiler: DslCompilerService,
    private readonly validator: DslValidatorService,
  ) {}

  /**
   * Preview: Compile DSL to AST without persisting
   * Used for live preview in the editor
   */
  preview(dsl: unknown, target: RenderTarget = 'html'): ResumeAst {
    this.logger.log(`Previewing DSL for target: ${target}`);
    return this.compiler.compileFromRaw(dsl, target);
  }

  /**
   * Validate DSL without compiling
   */
  validate(dsl: unknown): { valid: boolean; errors: unknown[] | null } {
    const result = this.validator.validate(dsl);
    return {
      valid: result.valid,
      errors: result.errors ?? null,
    };
  }

  /**
   * Render: Get compiled AST for a persisted resume
   * Merges theme + customizations, then compiles
   */
  async render(
    resumeId: string,
    userId: string,
    target: RenderTarget = 'html',
  ): Promise<{ ast: ResumeAst; resumeId: string }> {
    this.logger.log(`Rendering resume ${resumeId} for user ${userId}`);

    // Fetch resume with full data and theme
    const resume = await this.fetchResumeWithData(resumeId, userId);

    // Build merged DSL from theme + customizations
    const mergedDsl = this.mergeDslFromThemeAndCustom(resume);

    // Compile to AST
    const ast = this.compileWithResumeData(mergedDsl, resume, target);

    return { ast, resumeId };
  }

  /**
   * Render public resume (for shared/public resumes)
   */
  async renderPublic(
    slug: string,
    target: RenderTarget = 'html',
  ): Promise<{ ast: ResumeAst; slug: string }> {
    this.logger.log(`Rendering public resume: ${slug}`);

    const resume = await this.prisma.resume.findFirst({
      where: { slug, isPublic: true },
      include: {
        activeTheme: true,
        experiences: { orderBy: { order: 'asc' } },
        education: { orderBy: { startDate: 'desc' } },
        skills: { orderBy: { order: 'asc' } },
        languages: { orderBy: { order: 'asc' } },
        projects: { orderBy: { createdAt: 'desc' } },
        certifications: { orderBy: { issueDate: 'desc' } },
        awards: { orderBy: { date: 'desc' } },
        recommendations: { orderBy: { createdAt: 'desc' } },
        interests: { orderBy: { order: 'asc' } },
      },
    });

    if (!resume) {
      throw new BadRequestException('Resume not found or not public');
    }

    const mergedDsl = this.mergeDslFromThemeAndCustom(resume);
    const ast = this.compileWithResumeData(mergedDsl, resume, target);

    return { ast, slug };
  }

  /**
   * Fetch resume with all relations
   */
  private async fetchResumeWithData(
    resumeId: string,
    userId: string,
  ): Promise<ResumeWithRelations> {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId },
      include: {
        activeTheme: true,
        experiences: { orderBy: { order: 'asc' } },
        education: { orderBy: { startDate: 'desc' } },
        skills: { orderBy: { order: 'asc' } },
        languages: { orderBy: { order: 'asc' } },
        projects: { orderBy: { createdAt: 'desc' } },
        certifications: { orderBy: { issueDate: 'desc' } },
        awards: { orderBy: { date: 'desc' } },
        recommendations: { orderBy: { createdAt: 'desc' } },
        interests: { orderBy: { order: 'asc' } },
      },
    });

    if (!resume) {
      throw new BadRequestException('Resume not found');
    }

    return resume as ResumeWithRelations;
  }

  /**
   * Merge theme DSL with custom overrides
   */
  private mergeDslFromThemeAndCustom(
    resume: ResumeWithRelations,
  ): Record<string, unknown> {
    const baseDsl = (resume.activeTheme?.styleConfig ?? {}) as Record<
      string,
      unknown
    >;
    const customDsl = (resume.customTheme ?? {}) as Record<string, unknown>;

    return this.mergeDsl(baseDsl, customDsl);
  }

  /**
   * Compile DSL with resume data
   */
  private compileWithResumeData(
    mergedDsl: Record<string, unknown>,
    resumeData: ResumeWithRelations,
    target: RenderTarget,
  ): ResumeAst {
    // Validate merged DSL
    const validatedDsl = this.validator.validateOrThrow(mergedDsl as ResumeDsl);

    // Compile with resume data embedded
    if (target === 'html') {
      return this.compiler.compileForHtml(validatedDsl, resumeData);
    } else {
      return this.compiler.compileForPdf(validatedDsl, resumeData);
    }
  }

  /**
   * Deep merge two DSL objects
   * Custom overrides take precedence over base theme
   */
  private mergeDsl(
    base: Record<string, unknown>,
    overrides: Record<string, unknown>,
  ): Record<string, unknown> {
    const result = { ...base };

    for (const key of Object.keys(overrides)) {
      const baseValue = base[key];
      const overrideValue = overrides[key];

      if (
        typeof baseValue === 'object' &&
        baseValue !== null &&
        typeof overrideValue === 'object' &&
        overrideValue !== null &&
        !Array.isArray(baseValue) &&
        !Array.isArray(overrideValue)
      ) {
        result[key] = this.mergeDsl(
          baseValue as Record<string, unknown>,
          overrideValue as Record<string, unknown>,
        );
      } else if (overrideValue !== undefined) {
        result[key] = overrideValue;
      }
    }

    return result;
  }
}
