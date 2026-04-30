/**
 * Bundle token for the dsl BC. Doubles as the TypeScript shape and the
 * Nest DI token. Composition lives in `dsl.composition.ts` — Nest-free.
 */

import type { PreviewDslUseCase } from '../use-cases/preview-dsl/preview-dsl.use-case';
import type { RenderPublicResumeDslUseCase } from '../use-cases/render-public-resume-dsl/render-public-resume-dsl.use-case';
import type { RenderResumeDslUseCase } from '../use-cases/render-resume-dsl/render-resume-dsl.use-case';
import type { ValidateDslUseCase } from '../use-cases/validate-dsl/validate-dsl.use-case';

export abstract class DslUseCases {
  abstract readonly validateDsl: ValidateDslUseCase;
  abstract readonly previewDsl: PreviewDslUseCase;
  abstract readonly renderResumeDsl: RenderResumeDslUseCase;
  abstract readonly renderPublicResumeDsl: RenderPublicResumeDslUseCase;
}
