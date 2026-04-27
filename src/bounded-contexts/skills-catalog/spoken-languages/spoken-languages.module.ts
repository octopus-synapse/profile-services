/**
 * Spoken Languages Module
 * Provides spoken language catalog for resume language selection.
 *
 * Routes are described in `spoken-languages.routes.ts` and synthesized
 * into Nest controllers at module load.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { SpokenLanguagesRepositoryPort } from './application/ports/spoken-languages.port';
import { SpokenLanguagesRepository } from './infrastructure/adapters/persistence/spoken-languages.repository';
import { SpokenLanguagesService } from './services/spoken-languages.service';
import { spokenLanguagesRoutes } from './spoken-languages.routes';

@Module({
  imports: [PrismaModule],
  controllers: synthesizeRouteControllers(SpokenLanguagesService, spokenLanguagesRoutes),
  providers: [
    SpokenLanguagesService,
    {
      provide: SpokenLanguagesRepositoryPort,
      useFactory: (prisma: PrismaService) => new SpokenLanguagesRepository(prisma),
      inject: [PrismaService],
    },
  ],
  exports: [SpokenLanguagesService],
})
export class SpokenLanguagesModule {}
