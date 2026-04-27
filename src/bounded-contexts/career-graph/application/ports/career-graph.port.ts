/**
 * Bundle token for the career-graph BC. Doubles as the TypeScript shape
 * and the Nest DI token. Composition lives in `career-graph.composition.ts`
 * — Nest-free.
 */

import type { ViewCareerGraphUseCase } from '../use-cases/view-career-graph/view-career-graph.use-case';

export abstract class CareerGraphUseCases {
  abstract readonly viewCareerGraph: ViewCareerGraphUseCase;
}
