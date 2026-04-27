/**
 * Career Graph Module
 *
 * Thin Nest shell over `buildCareerGraphUseCases`. The HTTP boundary
 * lives in `career-graph.routes.ts`; the synthesizer turns those
 * `Route` descriptors into Nest controllers at boot, with the per-route
 * rate-limit guard wired via the guard registry.
 */

import { Module } from '@nestjs/common';
import { RateLimitModule } from '@/bounded-contexts/platform/common/rate-limit';
import { RateLimitGuard } from '@/bounded-contexts/platform/common/rate-limit/rate-limit.guard';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { CareerGraphUseCases } from './application/ports/career-graph.port';
import { buildCareerGraphUseCases } from './career-graph.composition';
import { careerGraphRoutes, RATE_LIMIT_KEY } from './career-graph.routes';

@Module({
  imports: [PrismaModule, RateLimitModule],
  controllers: synthesizeRouteControllers(CareerGraphUseCases, careerGraphRoutes, {
    guards: {
      'rate-limit': { guard: RateLimitGuard, metadataKey: RATE_LIMIT_KEY },
    },
  }),
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
