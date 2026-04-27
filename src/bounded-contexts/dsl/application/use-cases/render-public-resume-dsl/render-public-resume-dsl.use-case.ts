/**
 * Render the resume behind a public share slug into a compiled AST.
 *
 * The persistence port enforces the share gates (active flag +
 * expiration); a missing/inactive/expired share returns null and the
 * use case translates that into `EntityNotFoundException('ResumeShare')`.
 */

import type { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { GenericResume } from '@/shared-kernel/schemas/sections';
import type { SupportedLocale } from '@/shared-kernel/utils/locale-resolver';
import { ResumeNoActiveStyleException } from '../../../domain/exceptions/dsl.exceptions';
import { ResumeDslRepositoryPort } from '../../../domain/ports/resume-dsl.repository.port';
import type { ResumeAst } from '../../../domain/schemas/ast/resume-ast.schema';
import type { ResumeDsl } from '../../../domain/schemas/dsl';
import { mergeDsl } from '../../../domain/value-objects/merge-dsl';
import type { DslCompilerService } from '../../services/dsl-compiler.service';
import type { DslValidatorService } from '../../services/dsl-validator.service';

export type RenderTarget = 'html' | 'pdf';

export interface RenderPublicResumeDslInput {
  readonly slug: string;
  readonly target: RenderTarget;
  readonly locale: SupportedLocale;
}

export class RenderPublicResumeDslUseCase {
  constructor(
    private readonly repository: ResumeDslRepositoryPort,
    private readonly validator: DslValidatorService,
    private readonly compiler: DslCompilerService,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: RenderPublicResumeDslInput): Promise<{ ast: ResumeAst; slug: string }> {
    const [resume, sectionTypeTitles] = await Promise.all([
      this.repository.findPublicResumeBySlug(input.slug, input.locale),
      this.repository.getSectionTypeTitles(input.locale),
    ]);
    if (!resume) throw new EntityNotFoundException('ResumeShare', input.slug);

    const mergedDsl = buildMergedDsl(resume);
    const validated = this.validator.validateOrThrow(mergedDsl as ResumeDsl);
    const ast =
      input.target === 'html'
        ? this.compiler.compileForHtml(validated, resume, sectionTypeTitles)
        : this.compiler.compileForPdf(validated, resume, sectionTypeTitles);

    return { ast, slug: input.slug };
  }
}

function buildMergedDsl(resume: GenericResume): Record<string, unknown> {
  const baseDsl = resume.style?.styleConfig;
  if (!baseDsl || Object.keys(baseDsl as object).length === 0) {
    throw new ResumeNoActiveStyleException();
  }
  const customDsl = (resume.customTheme ?? {}) as Record<string, unknown>;
  return mergeDsl(baseDsl as Record<string, unknown>, customDsl);
}
