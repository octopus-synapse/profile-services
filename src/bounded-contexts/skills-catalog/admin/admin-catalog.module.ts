/**
 * Admin Catalog Module
 *
 * Thin Nest shell over `buildAdminCatalogUseCases`. All wiring lives
 * in `admin-catalog.composition.ts`. The 5 controllers (tech-areas,
 * tech-niches, tech-skills, spoken-languages, programming-languages)
 * each consume the bundle and delegate to the relevant use cases.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { AdminCatalogUseCases } from './application/ports/admin-catalog.port';
import { buildAdminCatalogUseCases } from './admin-catalog.composition';
import { AdminProgrammingLanguagesController } from './infrastructure/controllers/admin-programming-languages.controller';
import { AdminSpokenLanguagesController } from './infrastructure/controllers/admin-spoken-languages.controller';
import { AdminTechAreasController } from './infrastructure/controllers/admin-tech-areas.controller';
import { AdminTechNichesController } from './infrastructure/controllers/admin-tech-niches.controller';
import { AdminTechSkillsController } from './infrastructure/controllers/admin-tech-skills.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    AdminTechAreasController,
    AdminTechNichesController,
    AdminTechSkillsController,
    AdminSpokenLanguagesController,
    AdminProgrammingLanguagesController,
  ],
  providers: [
    {
      provide: AdminCatalogUseCases,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        buildAdminCatalogUseCases(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
  ],
  exports: [AdminCatalogUseCases],
})
export class AdminCatalogModule {}
