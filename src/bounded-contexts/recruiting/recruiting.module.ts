/**
 * Recruiting Bounded Context — reverse candidate match for recruiters.
 *
 * Wires the hexagonal layers per ADR-001:
 *   domain        — entities + outbound ports (framework-agnostic)
 *   application   — `MatchCandidatesForJobUseCase` + inbound port symbol
 *   infrastructure
 *     adapters    — Prisma repository implementing the outbound port
 *     controllers — thin HTTP boundary consuming the inbound port
 */

import { Module } from '@nestjs/common';
import { RateLimitModule } from '@/bounded-contexts/platform/common/rate-limit';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { MATCH_CANDIDATES_FOR_JOB_PORT, MatchCandidatesForJobUseCase } from './application';
import {
  CANDIDATE_DIRECTORY_REPOSITORY_PORT,
  type CandidateDirectoryRepositoryPort,
} from './domain';
import { PrismaCandidateDirectoryRepository } from './infrastructure/adapters';
import { MatchCandidatesController } from './infrastructure/controllers';

@Module({
  imports: [PrismaModule, RateLimitModule],
  controllers: [MatchCandidatesController],
  providers: [
    {
      provide: CANDIDATE_DIRECTORY_REPOSITORY_PORT,
      useClass: PrismaCandidateDirectoryRepository,
    },
    {
      provide: MATCH_CANDIDATES_FOR_JOB_PORT,
      useFactory: (directory: CandidateDirectoryRepositoryPort) =>
        new MatchCandidatesForJobUseCase(directory),
      inject: [CANDIDATE_DIRECTORY_REPOSITORY_PORT],
    },
  ],
  exports: [MATCH_CANDIDATES_FOR_JOB_PORT],
})
export class RecruitingModule {}
