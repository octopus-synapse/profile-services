/**
 * Career Graph Module
 *
 * Thin Nest shell over `buildCareerGraphUseCases`. All wiring lives in
 * `career-graph.composition.ts`.
 */

import { Module } from '@nestjs/common';
import { RateLimitModule } from '@/bounded-contexts/platform/common/rate-limit';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { CareerGraphUseCases } from './application/ports/career-graph.port';
import { buildCareerGraphUseCases } from './career-graph.composition';
import { ViewCareerGraphController } from './infrastructure/controllers';

@Module({
  imports: [PrismaModule, RateLimitModule],
  controllers: [ViewCareerGraphController],
  providers: [
    {
      provide: CareerGraphUseCases,
      useFactory: (prisma: PrismaService) => buildCareerGraphUseCases(prisma),
      inject: [PrismaService],
    },
  ],
  exports: [CareerGraphUseCases],
})
export class CareerGraphModule {}
