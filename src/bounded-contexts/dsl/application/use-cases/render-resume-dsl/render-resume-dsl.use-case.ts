/**
 * Render an authenticated user's own resume into a compiled AST.
 *
 * Pipeline:
 *   1. Load the resume (gated by userId) via the persistence port.
 *   2. Resolve section-type titles for the requested locale.
 *   3. Merge the active style's `styleConfig` with the resume's
 *      `customTheme` overrides — that's what the compiler consumes.
 *   4. Validate the merged DSL with the validator.
 *   5. Compile to AST for the requested target (html/pdf).
 */

import type { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { GenericResume } from '@/shared-kernel/schemas/sections';
import type { SupportedLocale } from '@/shared-kernel/utils/locale-resolver.util';
import { ResumeNoActiveStyleException } from '../../../domain/exceptions/dsl.exceptions';
import { ResumeDslRepositoryPort } from '../../../domain/ports/resume-dsl.repository.port';
import type { ResumeAst } from '../../../domain/schemas/ast/resume-ast.schema';
import type { ResumeDsl } from '../../../domain/schemas/dsl';
import { mergeDsl } from '../../../domain/value-objects/merge-dsl';
import type { DslCompilerService } from '../../services/dsl-compiler.service';
import type { DslValidatorService } from '../../services/dsl-validator.service';

export type RenderTarget = 'html' | 'pdf';

export interface RenderResumeDslInput {
  readonly resumeId: string;
  readonly userId: string;
  readonly target: RenderTarget;
  readonly locale: SupportedLocale;
  /** When the controller is rendering a draft theme that isn't yet
   *  saved as the resume's active style, it can pass the candidate
   *  styleConfig here and the use case merges that against the
   *  resume's `customTheme`. */
  readonly themeStyleConfig?: Record<string, unknown>;
}

export class RenderResumeDslUseCase {
  constructor(
    private readonly repository: ResumeDslRepositoryPort,
    private readonly validator: DslValidatorService,
    private readonly compiler: DslCompilerService,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: RenderResumeDslInput): Promise<{ ast: ResumeAst; resumeId: string }> {
    const [resume, sectionTypeTitles] = await Promise.all([
      this.repository.findOwnedResume(input.resumeId, input.userId, input.locale),
      this.repository.getSectionTypeTitles(input.locale),
    ]);
    if (!resume) throw new EntityNotFoundException('Resume', input.resumeId);

    const mergedDsl = input.themeStyleConfig
      ? mergeDsl(input.themeStyleConfig, (resume.customTheme ?? {}) as Record<string, unknown>)
      : buildMergedDsl(resume);

    const validated = this.validator.validateOrThrow(mergedDsl as ResumeDsl);
    const ast =
      input.target === 'html'
        ? this.compiler.compileForHtml(validated, resume, sectionTypeTitles)
        : this.compiler.compileForPdf(validated, resume, sectionTypeTitles);

    return { ast, resumeId: input.resumeId };
  }
}

/** Merges the active style's `styleConfig` with the resume's
 *  `customTheme` overrides. Throws when the resume has no style — a
 *  resume with no active style cannot be rendered. */
function buildMergedDsl(resume: GenericResume): Record<string, unknown> {
  const baseDsl = resume.style?.styleConfig;
  if (!baseDsl || Object.keys(baseDsl as object).length === 0) {
    throw new ResumeNoActiveStyleException();
  }
  const customDsl = (resume.customTheme ?? {}) as Record<string, unknown>;
  return mergeDsl(baseDsl as Record<string, unknown>, customDsl);
}
