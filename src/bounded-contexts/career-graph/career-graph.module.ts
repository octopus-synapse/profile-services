/**
 * Career Graph BC — cohort projection for the "where are people like me
 * going" surface. Hexagonal per ADR-001.
 */

import { Module } from '@nestjs/common';
import { RateLimitModule } from '@/bounded-contexts/platform/common/rate-limit';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { VIEW_CAREER_GRAPH_PORT, ViewCareerGraphUseCase } from './application';
import { CAREER_COHORT_REPOSITORY_PORT, type CareerCohortRepositoryPort } from './domain';
import { PrismaCareerCohortRepository } from './infrastructure/adapters';
import { ViewCareerGraphController } from './infrastructure/controllers';

@Module({
  imports: [PrismaModule, RateLimitModule],
  controllers: [ViewCareerGraphController],
  providers: [
    {
      provide: CAREER_COHORT_REPOSITORY_PORT,
      useClass: PrismaCareerCohortRepository,
    },
    {
      provide: VIEW_CAREER_GRAPH_PORT,
      useFactory: (repo: CareerCohortRepositoryPort) => new ViewCareerGraphUseCase(repo),
      inject: [CAREER_COHORT_REPOSITORY_PORT],
    },
  ],
  exports: [VIEW_CAREER_GRAPH_PORT],
})
export class CareerGraphModule {}
