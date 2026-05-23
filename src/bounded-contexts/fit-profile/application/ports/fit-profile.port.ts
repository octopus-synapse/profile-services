/**
 * Bundle token for the fit-profile BC. Doubles as the TypeScript shape
 * and the Nest DI token. Wiring lives in `fit-profile.module.ts` via a
 * useFactory that pulls the existing @Injectable use-case providers.
 */

import type { CreateFitQuestionUseCase } from '../use-cases/create-fit-question.use-case';
import type { DeleteFitProfileUseCase } from '../use-cases/delete-fit-profile.use-case';
import type { DeleteFitQuestionUseCase } from '../use-cases/delete-fit-question.use-case';
import type { GetFitProfileStatusUseCase } from '../use-cases/get-fit-profile-status.use-case';
import type { GetFitQuestionUseCase } from '../use-cases/get-fit-question.use-case';
import type { GetJobFitProfileUseCase } from '../use-cases/get-job-fit-profile.use-case';
import type { GetOrCreateQuestionSetUseCase } from '../use-cases/get-or-create-question-set.use-case';
import type { ListFitAnswersUseCase } from '../use-cases/list-fit-answers.use-case';
import type { ListFitQuestionsUseCase } from '../use-cases/list-fit-questions.use-case';
import type { SubmitFitAnswersUseCase } from '../use-cases/submit-fit-answers.use-case';
import type { UpdateFitQuestionUseCase } from '../use-cases/update-fit-question.use-case';
import type { UpsertJobFitProfileUseCase } from '../use-cases/upsert-job-fit-profile.use-case';

export abstract class FitProfileUseCases {
  abstract readonly getFitProfileStatus: GetFitProfileStatusUseCase;
  abstract readonly getOrCreateQuestionSet: GetOrCreateQuestionSetUseCase;
  abstract readonly submitFitAnswers: SubmitFitAnswersUseCase;
  abstract readonly listFitAnswers: ListFitAnswersUseCase;
  abstract readonly deleteFitProfile: DeleteFitProfileUseCase;

  abstract readonly upsertJobFitProfile: UpsertJobFitProfileUseCase;
  abstract readonly getJobFitProfile: GetJobFitProfileUseCase;

  abstract readonly listFitQuestions: ListFitQuestionsUseCase;
  abstract readonly createFitQuestion: CreateFitQuestionUseCase;
  abstract readonly updateFitQuestion: UpdateFitQuestionUseCase;
  abstract readonly deleteFitQuestion: DeleteFitQuestionUseCase;
  abstract readonly getFitQuestion: GetFitQuestionUseCase;
}
