/**
 * Recruiting Bounded Context — reverse candidate match for recruiters.
 *
 * Wires the hexagonal layers per ADR-001:
 *   domain        — entities + outbound ports (framework-agnostic)
 *   application   — `MatchCandidatesForJobUseCase` + inbound port symbol
 *   infrastructure
 *     adapters    — Prisma repository implementing the outbound port
 *
 * The HTTP boundary lives in `recruiting.routes.ts`; the synthesizer
 * turns those `Route` descriptors into Nest controllers at boot, with
 * the per-route rate-limit guard wired via the guard registry.
 */

import { Module } from '@nestjs/common';
import { RateLimitModule } from '@/bounded-contexts/platform/common/rate-limit';
import { RateLimitGuard } from '@/bounded-contexts/platform/common/rate-limit/rate-limit.guard';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { MatchCandidatesForJobUseCase } from './application';
import { MatchCandidatesForJobPort } from './application/ports/match-candidates.inbound-port';
import { CandidateDirectoryRepositoryPort } from './domain';
import { PrismaCandidateDirectoryRepository } from './infrastructure/adapters';
import { RATE_LIMIT_KEY, recruitingRoutes } from './recruiting.routes';

@Module({
  imports: [PrismaModule, RateLimitModule],
  controllers: synthesizeRouteControllers(MatchCandidatesForJobPort, recruitingRoutes, {
    guards: {
      'rate-limit': { guard: RateLimitGuard, metadataKey: RATE_LIMIT_KEY },
    },
  }),
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
