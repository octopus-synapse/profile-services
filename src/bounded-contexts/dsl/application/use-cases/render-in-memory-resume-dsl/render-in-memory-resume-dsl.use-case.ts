/**
 * Render an in-memory {@link GenericResume} into a compiled AST, styled
 * with a candidate style's `styleConfig`.
 *
 * This is the arbitrary-data sibling of {@link RenderSampleResumeDslUseCase}:
 * instead of the baked "Alex Rivera" sample, the caller passes a real
 * `GenericResume` it built itself (e.g. the onboarding preview maps the
 * user's saved `OnboardingProgress` into one). Like the sample path it
 * never touches the database, so it works before a primary résumé exists.
 *
 * Pipeline:
 *   1. Build the DSL `sections` from the resume's own sections (a leading
 *      `summary` entry + one entry per section, in order) so the compiler
 *      knows what to place. The defaults (tokens/layout) come from
 *      {@link SAMPLE_RESUME_DSL}; the candidate style's `tokens`/`layout`
 *      are overlaid on top (its always-empty `sections` is ignored).
 *   2. Compile that DSL with the in-memory content → AST.
 */

import type { LoggerPort } from '@/shared-kernel';
import type { GenericResume } from '@/shared-kernel/schemas/sections';
import type { ResumeAst } from '../../../domain/schemas/ast/resume-ast.schema';
import type { ResumeDsl } from '../../../domain/schemas/dsl';
import { mergeDsl } from '../../../domain/value-objects/merge-dsl';
import type { DslCompilerService } from '../../services/dsl-compiler.service';
import { SAMPLE_RESUME_DSL } from '../render-sample-resume-dsl/sample-resume';

export type RenderInMemoryTarget = 'html' | 'pdf';

export interface RenderInMemoryResumeDslInput {
  /** The résumé to render — already mapped from whatever source. */
  readonly resume: GenericResume;
  /** The candidate style's `styleConfig` — only its `tokens`/`layout`
   *  are applied; its (always-empty) `sections` is ignored. */
  readonly styleConfig: Record<string, unknown>;
  readonly target: RenderInMemoryTarget;
  /** Localized section-type titles (e.g. for the summary heading). */
  readonly sectionTypeTitles?: Map<string, string>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Build the DSL `sections` array from a résumé's own sections: a leading
 * `summary` entry (the compiler fills it from `resume.summary`) followed
 * by one entry per résumé section, preserving order. The `id` matches the
 * section's `sectionTypeKey` so the compiler binds content by key.
 */
function buildDslSections(resume: GenericResume): ResumeDsl['sections'] {
  const sections: ResumeDsl['sections'] = [
    { id: 'summary', visible: true, order: 0, column: 'main' },
  ];
  resume.sections.forEach((section, index) => {
    sections.push({
      id: section.sectionTypeKey,
      visible: true,
      order: index + 1,
      column: 'main',
    });
  });
  return sections;
}

export class RenderInMemoryResumeDslUseCase {
  constructor(
    private readonly compiler: DslCompilerService,
    private readonly logger: LoggerPort,
  ) {}

  execute(input: RenderInMemoryResumeDslInput): { ast: ResumeAst } {
    const overlay: Record<string, unknown> = {};
    if (isPlainObject(input.styleConfig.layout)) overlay.layout = input.styleConfig.layout;
    if (isPlainObject(input.styleConfig.tokens)) overlay.tokens = input.styleConfig.tokens;

    const base = {
      ...SAMPLE_RESUME_DSL,
      sections: buildDslSections(input.resume),
    } as unknown as Record<string, unknown>;

    const merged = mergeDsl(base, overlay) as ResumeDsl;

    let ast: ResumeAst;
    try {
      ast = this.compileFor(merged, input);
    } catch (err) {
      // A candidate style's `styleConfig` can carry values outside the DSL
      // schema (e.g. the seeded ATS Compact uses `margins: 'narrow'` /
      // `fontFamily: 'helvetica'`, neither of which is in the enums). Rather
      // than fail the whole preview, drop the overlay and render the base
      // defaults — the HTML mirror is hardcoded per template, so the visible
      // output (especially for `ats`) is unchanged by the dropped tokens.
      this.logger.warn(
        `In-memory résumé style overlay invalid; rendering base defaults: ${
          err instanceof Error ? err.message : String(err)
        }`,
        'RenderInMemoryResumeDslUseCase',
      );
      ast = this.compileFor(base as unknown as ResumeDsl, input);
    }

    this.logger.log('Rendered in-memory résumé DSL', 'RenderInMemoryResumeDslUseCase');
    return { ast };
  }

  private compileFor(dsl: ResumeDsl, input: RenderInMemoryResumeDslInput): ResumeAst {
    return input.target === 'html'
      ? this.compiler.compileForHtml(dsl, input.resume, input.sectionTypeTitles)
      : this.compiler.compileForPdf(dsl, input.resume, input.sectionTypeTitles);
  }
}
