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
import { MatchCandidatesForJobUseCase } from './application';
import { MatchCandidatesForJobPort } from './application/ports/match-candidates.inbound-port';
import { CandidateDirectoryRepositoryPort } from './domain';
import { PrismaCandidateDirectoryRepository } from './infrastructure/adapters';
import { MatchCandidatesController } from './infrastructure/controllers';

@Module({
  imports: [PrismaModule, RateLimitModule],
  controllers: [MatchCandidatesController],
  providers: [
    { provide: CandidateDirectoryRepositoryPort, useClass: PrismaCandidateDirectoryRepository },
    {
      provide: MatchCandidatesForJobPort,
      useFactory: (directory: CandidateDirectoryRepositoryPort) =>
        new MatchCandidatesForJobUseCase(directory),
      inject: [CandidateDirectoryRepositoryPort],
    },
  ],
  exports: [MatchCandidatesForJobPort],
})
export class RecruitingModule {}
