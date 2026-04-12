import type { AuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.service';
import type { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ONBOARDING_USE_CASES, type OnboardingUseCases } from '../../domain/ports/onboarding.port';
import { OnboardingRepository } from '../../infrastructure/adapters/persistence/onboarding.repository';
import { OnboardingCompletionAdapter } from '../../infrastructure/adapters/persistence/onboarding-completion.adapter';
import { OnboardingProgressRepository } from '../../infrastructure/adapters/persistence/onboarding-progress.repository';
import { ResumeOnboardingAdapter } from '../../infrastructure/adapters/persistence/resume-onboarding.adapter';
import { ResumeSectionOnboardingAdapter } from '../../infrastructure/adapters/persistence/resume-section-onboarding.adapter';
import { SectionTypeDefinitionAdapter } from '../../infrastructure/adapters/persistence/section-type-definition.adapter';
import { AdvanceOnboardingStepUseCase } from '../use-cases/advance-onboarding-step/advance-onboarding-step.use-case';
import { CompleteOnboardingUseCase } from '../use-cases/complete-onboarding/complete-onboarding.use-case';
import { CompleteOnboardingFromProgressUseCase } from '../use-cases/complete-onboarding-from-progress/complete-onboarding-from-progress.use-case';
import { GetOnboardingStatusUseCase } from '../use-cases/get-onboarding-status/get-onboarding-status.use-case';
import { GetProgressUseCase } from '../use-cases/get-progress/get-progress.use-case';
import { GetSectionTypeDefinitionsUseCase } from '../use-cases/get-section-type-definitions/get-section-type-definitions.use-case';
import { GoBackOnboardingStepUseCase } from '../use-cases/go-back-onboarding-step/go-back-onboarding-step.use-case';
import { GotoOnboardingStepUseCase } from '../use-cases/goto-onboarding-step/goto-onboarding-step.use-case';
import { SaveOnboardingStepDataUseCase } from '../use-cases/save-onboarding-step-data/save-onboarding-step-data.use-case';
import { SaveProgressUseCase } from '../use-cases/save-progress/save-progress.use-case';

export { ONBOARDING_USE_CASES };

export function buildOnboardingUseCases(
  prisma: PrismaService,
  logger: AppLoggerService,
  auditLog: AuditLogService,
): OnboardingUseCases {
  // Repositories
  const onboardingRepository = new OnboardingRepository(prisma);
  const progressRepository = new OnboardingProgressRepository(prisma);

  // Infrastructure adapters
  const resumeAdapter = new ResumeOnboardingAdapter(prisma);
  const sectionAdapter = new ResumeSectionOnboardingAdapter();
  const completionAdapter = new OnboardingCompletionAdapter(prisma, resumeAdapter, sectionAdapter);
  const sectionTypeDefinition = new SectionTypeDefinitionAdapter(prisma);

  // Progress use cases (used as functions by navigation use cases)
  const saveProgressUseCase = new SaveProgressUseCase(progressRepository);
  const getProgressUseCase = new GetProgressUseCase(progressRepository);

  // Wrap use cases as functions for navigation
  const saveProgressFn: import('../use-cases/shared/navigation.types').SaveProgressFn = (
    userId,
    data,
  ) => saveProgressUseCase.execute(userId, data);
  const getProgressFn = (userId: string) => getProgressUseCase.execute(userId);

  // Completion use cases
  const completeOnboardingUseCase = new CompleteOnboardingUseCase(
    onboardingRepository,
    completionAdapter,
    logger,
    auditLog,
  );
  const completeOnboardingFromProgressUseCase = new CompleteOnboardingFromProgressUseCase(
    getProgressFn,
    completeOnboardingUseCase,
  );

  // Navigation use cases
  const advanceOnboardingStepUseCase = new AdvanceOnboardingStepUseCase(
    saveProgressFn,
    getProgressFn,
    sectionTypeDefinition,
    logger,
  );
  const goBackOnboardingStepUseCase = new GoBackOnboardingStepUseCase(
    saveProgressFn,
    getProgressFn,
    sectionTypeDefinition,
  );
  const gotoOnboardingStepUseCase = new GotoOnboardingStepUseCase(
    saveProgressFn,
    getProgressFn,
    sectionTypeDefinition,
  );
  const saveOnboardingStepDataUseCase = new SaveOnboardingStepDataUseCase(
    saveProgressFn,
    getProgressFn,
  );

  // Query use cases
  const getOnboardingStatusUseCase = new GetOnboardingStatusUseCase(onboardingRepository);
  const getSectionTypeDefinitionsUseCase = new GetSectionTypeDefinitionsUseCase(
    sectionTypeDefinition,
  );

  return {
    completeOnboardingUseCase,
    completeOnboardingFromProgressUseCase,
    getOnboardingStatusUseCase,
    advanceOnboardingStepUseCase,
    goBackOnboardingStepUseCase,
    gotoOnboardingStepUseCase,
    saveOnboardingStepDataUseCase,
    getSectionTypeDefinitionsUseCase,
  };
}
