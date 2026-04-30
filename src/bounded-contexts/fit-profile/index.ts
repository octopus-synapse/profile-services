export { DeleteFitProfileUseCase } from './application/use-cases/delete-fit-profile.use-case';
export { ExpireFitProfileUseCase } from './application/use-cases/expire-fit-profile.use-case';
export { GetFitProfileStatusUseCase } from './application/use-cases/get-fit-profile-status.use-case';
export { GetOrCreateQuestionSetUseCase } from './application/use-cases/get-or-create-question-set.use-case';
export { SubmitFitAnswersUseCase } from './application/use-cases/submit-fit-answers.use-case';
export { UpsertJobFitProfileUseCase } from './application/use-cases/upsert-job-fit-profile.use-case';
export type { SavedJobFitProfile } from './domain/ports/job-fit-profile.repository.port';
export { JobFitProfileRepositoryPort } from './domain/ports/job-fit-profile.repository.port';
export { SimilarityPort, type SimilarityResult } from './domain/ports/similarity.port';
export type { SavedUserFitProfile } from './domain/ports/user-fit-profile.repository.port';
export { UserFitProfileRepositoryPort } from './domain/ports/user-fit-profile.repository.port';
export type { FitDimension, FitProfileStatus, FitScaleType, FitVector } from './domain/types';
export { FIT_DIMENSIONS, FIT_RULES_VERSION, FIT_VECTOR_TTL_DAYS } from './domain/types';
export {
  buildFitProfileBundle,
  buildFitProfileComposition,
  buildFitProfileUseCases,
  type FitProfileBuildResult,
  type FitProfileExtras,
  registerFitProfileJobs,
} from './fit-profile.composition';
