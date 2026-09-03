/**
 * Bundle token for the fit-profile BC. Doubles as the TypeScript shape
 * and the Nest DI token. Wiring lives in `fit-profile.module.ts` via a
 * useFactory that pulls the existing @Injectable use-case providers.
 */

import type { GetFitProfileStatusUseCase } from '../use-cases/get-fit-profile-status.use-case';
import type { GetOrCreateQuestionSetUseCase } from '../use-cases/get-or-create-question-set.use-case';
import type { SubmitFitAnswersUseCase } from '../use-cases/submit-fit-answers.use-case';

export abstract class FitProfileUseCases {
  abstract readonly getFitProfileStatus: GetFitProfileStatusUseCase;
  abstract readonly getOrCreateQuestionSet: GetOrCreateQuestionSetUseCase;
  abstract readonly submitFitAnswers: SubmitFitAnswersUseCase;
}
