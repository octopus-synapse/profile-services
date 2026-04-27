/**
 * Bundle token for the resume-quality BC. Doubles as the TypeScript
 * shape of the use-case bag and the Nest DI token. Composition lives
 * in `resume-quality.composition.ts` — Nest-free.
 */

import type { ComputeQualityUseCase } from '../use-cases/compute-quality.use-case';
import type { GetLatestQualityUseCase } from '../use-cases/get-latest-quality.use-case';

export abstract class ResumeQualityUseCases {
  abstract readonly computeQuality: ComputeQualityUseCase;
  abstract readonly getLatestQuality: GetLatestQualityUseCase;
}
