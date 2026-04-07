/**
 * Onboarding Bounded Context - Public API
 *
 * ADR-001: Flat Hexagonal Architecture
 */

export { OnboardingModule } from './onboarding.module';
export { OnboardingRepositoryPort } from './domain/ports/onboarding.port';
export { OnboardingProgressRepositoryPort } from './domain/ports/onboarding-progress.port';
export type {
  OnboardingCompletionResult,
  OnboardingStatus,
  OnboardingUseCases,
  UserForOnboarding,
} from './domain/ports/onboarding.port';
export type {
  OnboardingProgressData,
  OnboardingProgressUseCases,
  ProgressRecord,
  SaveProgressResult,
  SectionProgressData,
} from './domain/ports/onboarding-progress.port';
