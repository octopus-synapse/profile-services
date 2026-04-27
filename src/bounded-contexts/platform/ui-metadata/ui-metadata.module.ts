/**
 * UI Metadata Module
 *
 * Thin Nest shell over `buildUiMetadataUseCases`. All wiring lives in
 * `ui-metadata.composition.ts`; this module only adapts the bundle to
 * Nest's DI container. HTTP surface is described as `Route` descriptors
 * in `ui-metadata.routes.ts`.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { UiMetadataUseCases } from './application/ports/ui-metadata.port';
import { buildUiMetadataUseCases } from './ui-metadata.composition';
import { uiMetadataRoutes } from './ui-metadata.routes';

@Module({
  imports: [PrismaModule],
  controllers: synthesizeRouteControllers(UiMetadataUseCases, uiMetadataRoutes),
  providers: [
    {
      provide: UiMetadataUseCases,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        buildUiMetadataUseCases(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
  ],
  exports: [UiMetadataUseCases],
})
export class UiMetadataModule {}
