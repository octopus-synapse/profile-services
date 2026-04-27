/**
 * UI Metadata Module
 *
 * Thin Nest shell over `buildUiMetadataUseCases`. All wiring lives in
 * `ui-metadata.composition.ts`; this module only adapts the bundle to
 * Nest's DI container.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { UiMetadataUseCases } from './application/ports/ui-metadata.port';
import { MeDashboardController } from './infrastructure/controllers/me-dashboard.controller';
import { UiMetadataController } from './infrastructure/controllers/ui-metadata.controller';
import { buildUiMetadataUseCases } from './ui-metadata.composition';

@Module({
  imports: [PrismaModule],
  controllers: [UiMetadataController, MeDashboardController],
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
