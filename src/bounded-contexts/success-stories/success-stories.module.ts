/**
 * Success Stories Module
 *
 * Thin Nest shell over `buildSuccessStoriesUseCases`. Controllers are
 * synthesized from `success-stories.routes.ts`. All wiring lives in
 * `success-stories.composition.ts`.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { SuccessStoriesUseCases } from './application/ports/success-stories.port';
import { buildSuccessStoriesUseCases } from './success-stories.composition';
import { successStoriesRoutes } from './success-stories.routes';

@Module({
  imports: [PrismaModule],
  controllers: synthesizeRouteControllers(SuccessStoriesUseCases, successStoriesRoutes),
  providers: [
    {
      provide: SuccessStoriesUseCases,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        buildSuccessStoriesUseCases(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
  ],
  exports: [SuccessStoriesUseCases],
})
export class SuccessStoriesModule {}
