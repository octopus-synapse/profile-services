/**
 * Career Graph BC — cohort projection for the "where are people like me
 * going" surface. Hexagonal per ADR-001.
 */

import { Module } from '@nestjs/common';
import { RateLimitModule } from '@/bounded-contexts/platform/common/rate-limit';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { ViewCareerGraphUseCase } from './application';
import { ViewCareerGraphPort } from './application/ports/view-career-graph.inbound-port';
import { CareerCohortRepositoryPort } from './domain';
import { PrismaCareerCohortRepository } from './infrastructure/adapters';
import { ViewCareerGraphController } from './infrastructure/controllers';

@Module({
  imports: [PrismaModule, RateLimitModule],
  controllers: [ViewCareerGraphController],
  providers: [
    { provide: CareerCohortRepositoryPort, useClass: PrismaCareerCohortRepository },
    {
      provide: ViewCareerGraphPort,
      useFactory: (repo: CareerCohortRepositoryPort) => new ViewCareerGraphUseCase(repo),
      inject: [CareerCohortRepositoryPort],
    },
  ],
  exports: [ViewCareerGraphPort],
})
export class CareerGraphModule {}
