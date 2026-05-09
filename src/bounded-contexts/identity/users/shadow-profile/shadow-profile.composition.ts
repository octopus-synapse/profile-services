import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { ClaimShadowProfileUseCasePort } from './application/ports/claim-shadow-profile.use-case.port';
import type { FindShadowCandidatesUseCasePort } from './application/ports/find-shadow-candidates.use-case.port';
import type { UpsertShadowGithubUseCasePort } from './application/ports/upsert-shadow-github.use-case.port';
import { ClaimShadowProfileUseCase } from './application/use-cases/claim-shadow-profile.use-case';
import { FindShadowCandidatesUseCase } from './application/use-cases/find-shadow-candidates.use-case';
import { UpsertShadowGithubUseCase } from './application/use-cases/upsert-shadow-github.use-case';
import { ApplyShadowPayloadToUserPolicy } from './domain/rules/apply-shadow-payload-to-user.policy';
import { ShadowGithubApiAdapter } from './github-api.adapter';
import { PrismaShadowProfileRepository } from './infrastructure/adapters/persistence/prisma-shadow-profile.repository';
import { PrismaUserResumeShadowApplyAdapter } from './infrastructure/adapters/persistence/prisma-user-resume-shadow-apply.adapter';
import { shadowProfileRoutes } from './shadow-profile.routes';

export interface ShadowProfileUseCasesBundle {
  readonly upsertGithub: UpsertShadowGithubUseCasePort;
  readonly findCandidates: FindShadowCandidatesUseCasePort;
  readonly claim: ClaimShadowProfileUseCasePort;
}

export function buildShadowProfileUseCases(
  prisma: PrismaService,
  logger: LoggerPort,
): ShadowProfileUseCasesBundle {
  const githubApi = new ShadowGithubApiAdapter(logger);
  const repository = new PrismaShadowProfileRepository(prisma, logger);
  const applyAdapter = new PrismaUserResumeShadowApplyAdapter(prisma, logger);
  const applyPolicy = new ApplyShadowPayloadToUserPolicy(applyAdapter);

  return {
    upsertGithub: new UpsertShadowGithubUseCase(repository, githubApi, logger),
    findCandidates: new FindShadowCandidatesUseCase(repository),
    claim: new ClaimShadowProfileUseCase(repository, applyPolicy, logger),
  };
}

export function buildShadowProfileComposition(
  prisma: PrismaService,
  logger: LoggerPort,
): BoundedContextComposition<ShadowProfileUseCasesBundle> {
  const useCases = buildShadowProfileUseCases(prisma, logger);
  return {
    useCases,
    routes: shadowProfileRoutes,
  };
}
