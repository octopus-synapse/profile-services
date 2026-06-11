/**
 * Render the built-in sample résumé into a compiled AST, styled with a
 * candidate style's `styleConfig`.
 *
 * This backs the *generic* style preview: it never touches the database
 * or a real résumé, so it works for users who don't have a primary
 * résumé yet (e.g. mid-onboarding, at the résumé-style step).
 *
 * Pipeline:
 *   1. Overlay the style's `tokens` + `layout` onto {@link SAMPLE_RESUME_DSL},
 *      preserving the sample's `sections` (the style config's own
 *      `sections` is always `[]`, so we must not let it overwrite ours).
 *   2. Compile that DSL with the baked sample content → AST.
 */

import type { LoggerPort } from '@/shared-kernel';
import type { Locale } from '@/shared-kernel/utils/locale-resolver.util';
import type { ResumeAst } from '../../../domain/schemas/ast/resume-ast.schema';
import { mergeDsl } from '../../../domain/value-objects/merge-dsl';
import type { DslCompilerService } from '../../services/dsl-compiler.service';
import { buildSampleResume, SAMPLE_RESUME_DSL } from './sample-resume';

export type RenderSampleTarget = 'html' | 'pdf';

export interface RenderSampleResumeDslInput {
  /** The candidate style's `styleConfig` — only its `tokens`/`layout`
   *  are applied; its (always-empty) `sections` are ignored. */
  readonly styleConfig: Record<string, unknown>;
  readonly target: RenderSampleTarget;
  readonly locale: Locale;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class RenderSampleResumeDslUseCase {
  constructor(
    private readonly compiler: DslCompilerService,
    private readonly logger: LoggerPort,
  ) {}

  execute(input: RenderSampleResumeDslInput): { ast: ResumeAst } {
    const overlay: Record<string, unknown> = {};
    if (isPlainObject(input.styleConfig.layout)) overlay.layout = input.styleConfig.layout;
    if (isPlainObject(input.styleConfig.tokens)) overlay.tokens = input.styleConfig.tokens;

    const merged = mergeDsl(SAMPLE_RESUME_DSL, overlay);

    const resume = buildSampleResume(input.locale);
    const ast =
      input.target === 'html'
        ? this.compiler.compileForHtml(merged, resume)
        : this.compiler.compileForPdf(merged, resume);

    this.logger.log('Rendered sample résumé preview DSL', 'RenderSampleResumeDslUseCase');
    return { ast };
  }
}
