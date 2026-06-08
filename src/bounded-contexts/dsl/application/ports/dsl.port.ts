/**
 * Bundle token for the dsl BC. Doubles as the TypeScript shape and the
 * Nest DI token. Composition lives in `dsl.composition.ts` — Nest-free.
 */

import type { PreviewDslUseCase } from '../use-cases/preview-dsl/preview-dsl.use-case';
import type { RenderInMemoryResumeDslUseCase } from '../use-cases/render-in-memory-resume-dsl/render-in-memory-resume-dsl.use-case';
import type { RenderPublicResumeDslUseCase } from '../use-cases/render-public-resume-dsl/render-public-resume-dsl.use-case';
import type { RenderResumeDslUseCase } from '../use-cases/render-resume-dsl/render-resume-dsl.use-case';
import type { RenderSampleResumeDslUseCase } from '../use-cases/render-sample-resume-dsl/render-sample-resume-dsl.use-case';
import type { ValidateDslUseCase } from '../use-cases/validate-dsl/validate-dsl.use-case';

export abstract class DslUseCases {
  abstract readonly validateDsl: ValidateDslUseCase;
  abstract readonly previewDsl: PreviewDslUseCase;
  abstract readonly renderResumeDsl: RenderResumeDslUseCase;
  abstract readonly renderPublicResumeDsl: RenderPublicResumeDslUseCase;
  /** Renders the built-in sample résumé for the generic style preview —
   *  no DB, works without a primary résumé. */
  abstract readonly renderSampleResumeDsl: RenderSampleResumeDslUseCase;
  /** Renders an arbitrary in-memory résumé for the generic style preview
   *  (e.g. onboarding maps saved progress into one) — no DB. */
  abstract readonly renderInMemoryResumeDsl: RenderInMemoryResumeDslUseCase;
}
