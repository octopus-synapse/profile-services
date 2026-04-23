import { Module } from '@nestjs/common';
import { FitProfileModule } from '@/bounded-contexts/fit-profile/fit-profile.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { ComputeMatchUseCase } from './application/use-cases/compute-match.use-case';
import { JobLoaderPort } from './domain/ports/job-loader.port';
import { MatchCachePort } from './domain/ports/match-cache.port';
import { RequirementsMatcherPort } from './domain/ports/requirements-matcher.port';
import { ResumeExistencePort } from './domain/ports/resume-existence.port';
import { ResumeKeywordSourcePort } from './domain/ports/resume-keyword-source.port';
import { SemanticMatcherPort } from './domain/ports/semantic-matcher.port';
import { UserFitStatePort } from './domain/ports/user-fit-state.port';
import { PrismaResumeKeywordSource } from './infrastructure/adapters/keyword-matcher.adapter';
import { NoopMatchCacheAdapter } from './infrastructure/adapters/noop-match-cache.adapter';
import { PrismaJobLoader } from './infrastructure/adapters/persistence/prisma-job-loader.repository';
import { PrismaResumeExistence } from './infrastructure/adapters/persistence/prisma-resume-existence.repository';
import { PrismaUserFitStateAdapter } from './infrastructure/adapters/persistence/prisma-user-fit-state.repository';
import { RequirementsMatcherStubAdapter } from './infrastructure/adapters/requirements-matcher-stub.adapter';
import { SemanticMatcherStubAdapter } from './infrastructure/adapters/semantic-matcher-stub.adapter';
import { JobMatchController } from './infrastructure/controllers/job-match.controller';

/**
 * job-match/ bounded context — owner of the Match Score. Consumes
 * `SimilarityPort` from the `fit-profile` context for the Fit sub-score;
 * the AI sub-scores (Requirements, Semantic) ship behind stub adapters
 * until Task #19 plugs in the real LLM/embedding implementations.
 */
@Module({
  imports: [PrismaModule, FitProfileModule],
  controllers: [JobMatchController],
  providers: [
    ComputeMatchUseCase,
    PrismaResumeExistence,
    PrismaJobLoader,
    PrismaUserFitStateAdapter,
    PrismaResumeKeywordSource,
    RequirementsMatcherStubAdapter,
    SemanticMatcherStubAdapter,
    NoopMatchCacheAdapter,
    { provide: ResumeExistencePort, useExisting: PrismaResumeExistence },
    { provide: JobLoaderPort, useExisting: PrismaJobLoader },
    { provide: UserFitStatePort, useExisting: PrismaUserFitStateAdapter },
    { provide: ResumeKeywordSourcePort, useExisting: PrismaResumeKeywordSource },
    { provide: RequirementsMatcherPort, useExisting: RequirementsMatcherStubAdapter },
    { provide: SemanticMatcherPort, useExisting: SemanticMatcherStubAdapter },
    { provide: MatchCachePort, useExisting: NoopMatchCacheAdapter },
  ],
  exports: [ComputeMatchUseCase],
})
export class JobMatchModule {}
