/**
 * Admin Catalog Module
 *
 * ADR-001: 5 admin CRUD surfaces (tech-areas, tech-niches, tech-skills,
 * spoken-languages, programming-languages) each share the same shape:
 * one Prisma adapter behind a dedicated port + 5 POJO use cases
 * (list / get / create / update / delete) wired via useFactory.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { CreateAdminProgrammingLanguageUseCase } from './application/use-cases/create-admin-programming-language/create-admin-programming-language.use-case';
import { CreateAdminSpokenLanguageUseCase } from './application/use-cases/create-admin-spoken-language/create-admin-spoken-language.use-case';
import { CreateAdminTechAreaUseCase } from './application/use-cases/create-admin-tech-area/create-admin-tech-area.use-case';
import { CreateAdminTechNicheUseCase } from './application/use-cases/create-admin-tech-niche/create-admin-tech-niche.use-case';
import { CreateAdminTechSkillUseCase } from './application/use-cases/create-admin-tech-skill/create-admin-tech-skill.use-case';
import { DeleteAdminProgrammingLanguageUseCase } from './application/use-cases/delete-admin-programming-language/delete-admin-programming-language.use-case';
import { DeleteAdminSpokenLanguageUseCase } from './application/use-cases/delete-admin-spoken-language/delete-admin-spoken-language.use-case';
import { DeleteAdminTechAreaUseCase } from './application/use-cases/delete-admin-tech-area/delete-admin-tech-area.use-case';
import { DeleteAdminTechNicheUseCase } from './application/use-cases/delete-admin-tech-niche/delete-admin-tech-niche.use-case';
import { DeleteAdminTechSkillUseCase } from './application/use-cases/delete-admin-tech-skill/delete-admin-tech-skill.use-case';
import { GetAdminProgrammingLanguageUseCase } from './application/use-cases/get-admin-programming-language/get-admin-programming-language.use-case';
import { GetAdminSpokenLanguageUseCase } from './application/use-cases/get-admin-spoken-language/get-admin-spoken-language.use-case';
import { GetAdminTechAreaUseCase } from './application/use-cases/get-admin-tech-area/get-admin-tech-area.use-case';
import { GetAdminTechNicheUseCase } from './application/use-cases/get-admin-tech-niche/get-admin-tech-niche.use-case';
import { GetAdminTechSkillUseCase } from './application/use-cases/get-admin-tech-skill/get-admin-tech-skill.use-case';
import { ListAdminProgrammingLanguagesUseCase } from './application/use-cases/list-admin-programming-languages/list-admin-programming-languages.use-case';
import { ListAdminSpokenLanguagesUseCase } from './application/use-cases/list-admin-spoken-languages/list-admin-spoken-languages.use-case';
import { ListAdminTechAreasUseCase } from './application/use-cases/list-admin-tech-areas/list-admin-tech-areas.use-case';
import { ListAdminTechNichesUseCase } from './application/use-cases/list-admin-tech-niches/list-admin-tech-niches.use-case';
import { ListAdminTechSkillsUseCase } from './application/use-cases/list-admin-tech-skills/list-admin-tech-skills.use-case';
import { UpdateAdminProgrammingLanguageUseCase } from './application/use-cases/update-admin-programming-language/update-admin-programming-language.use-case';
import { UpdateAdminSpokenLanguageUseCase } from './application/use-cases/update-admin-spoken-language/update-admin-spoken-language.use-case';
import { UpdateAdminTechAreaUseCase } from './application/use-cases/update-admin-tech-area/update-admin-tech-area.use-case';
import { UpdateAdminTechNicheUseCase } from './application/use-cases/update-admin-tech-niche/update-admin-tech-niche.use-case';
import { UpdateAdminTechSkillUseCase } from './application/use-cases/update-admin-tech-skill/update-admin-tech-skill.use-case';
import { AdminProgrammingLanguagesRepositoryPort } from './domain/ports/admin-programming-languages.repository.port';
import { AdminSpokenLanguagesRepositoryPort } from './domain/ports/admin-spoken-languages.repository.port';
import { AdminTechAreasRepositoryPort } from './domain/ports/admin-tech-areas.repository.port';
import { AdminTechNichesRepositoryPort } from './domain/ports/admin-tech-niches.repository.port';
import { AdminTechSkillsRepositoryPort } from './domain/ports/admin-tech-skills.repository.port';
import { PrismaAdminProgrammingLanguagesRepository } from './infrastructure/adapters/persistence/prisma-admin-programming-languages.repository';
import { PrismaAdminSpokenLanguagesRepository } from './infrastructure/adapters/persistence/prisma-admin-spoken-languages.repository';
import { PrismaAdminTechAreasRepository } from './infrastructure/adapters/persistence/prisma-admin-tech-areas.repository';
import { PrismaAdminTechNichesRepository } from './infrastructure/adapters/persistence/prisma-admin-tech-niches.repository';
import { PrismaAdminTechSkillsRepository } from './infrastructure/adapters/persistence/prisma-admin-tech-skills.repository';
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
    // ----- Repository ports → Prisma adapters -----
    {
      provide: AdminTechAreasRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaAdminTechAreasRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: AdminTechNichesRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaAdminTechNichesRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: AdminTechSkillsRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaAdminTechSkillsRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: AdminSpokenLanguagesRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaAdminSpokenLanguagesRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: AdminProgrammingLanguagesRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaAdminProgrammingLanguagesRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },

    // ----- Tech areas use cases -----
    {
      provide: ListAdminTechAreasUseCase,
      useFactory: (r: AdminTechAreasRepositoryPort) => new ListAdminTechAreasUseCase(r),
      inject: [AdminTechAreasRepositoryPort],
    },
    {
      provide: GetAdminTechAreaUseCase,
      useFactory: (r: AdminTechAreasRepositoryPort) => new GetAdminTechAreaUseCase(r),
      inject: [AdminTechAreasRepositoryPort],
    },
    {
      provide: CreateAdminTechAreaUseCase,
      useFactory: (r: AdminTechAreasRepositoryPort) => new CreateAdminTechAreaUseCase(r),
      inject: [AdminTechAreasRepositoryPort],
    },
    {
      provide: UpdateAdminTechAreaUseCase,
      useFactory: (r: AdminTechAreasRepositoryPort) => new UpdateAdminTechAreaUseCase(r),
      inject: [AdminTechAreasRepositoryPort],
    },
    {
      provide: DeleteAdminTechAreaUseCase,
      useFactory: (r: AdminTechAreasRepositoryPort) => new DeleteAdminTechAreaUseCase(r),
      inject: [AdminTechAreasRepositoryPort],
    },

    // ----- Tech niches use cases -----
    {
      provide: ListAdminTechNichesUseCase,
      useFactory: (r: AdminTechNichesRepositoryPort) => new ListAdminTechNichesUseCase(r),
      inject: [AdminTechNichesRepositoryPort],
    },
    {
      provide: GetAdminTechNicheUseCase,
      useFactory: (r: AdminTechNichesRepositoryPort) => new GetAdminTechNicheUseCase(r),
      inject: [AdminTechNichesRepositoryPort],
    },
    {
      provide: CreateAdminTechNicheUseCase,
      useFactory: (r: AdminTechNichesRepositoryPort) => new CreateAdminTechNicheUseCase(r),
      inject: [AdminTechNichesRepositoryPort],
    },
    {
      provide: UpdateAdminTechNicheUseCase,
      useFactory: (r: AdminTechNichesRepositoryPort) => new UpdateAdminTechNicheUseCase(r),
      inject: [AdminTechNichesRepositoryPort],
    },
    {
      provide: DeleteAdminTechNicheUseCase,
      useFactory: (r: AdminTechNichesRepositoryPort) => new DeleteAdminTechNicheUseCase(r),
      inject: [AdminTechNichesRepositoryPort],
    },

    // ----- Tech skills use cases -----
    {
      provide: ListAdminTechSkillsUseCase,
      useFactory: (r: AdminTechSkillsRepositoryPort) => new ListAdminTechSkillsUseCase(r),
      inject: [AdminTechSkillsRepositoryPort],
    },
    {
      provide: GetAdminTechSkillUseCase,
      useFactory: (r: AdminTechSkillsRepositoryPort) => new GetAdminTechSkillUseCase(r),
      inject: [AdminTechSkillsRepositoryPort],
    },
    {
      provide: CreateAdminTechSkillUseCase,
      useFactory: (r: AdminTechSkillsRepositoryPort) => new CreateAdminTechSkillUseCase(r),
      inject: [AdminTechSkillsRepositoryPort],
    },
    {
      provide: UpdateAdminTechSkillUseCase,
      useFactory: (r: AdminTechSkillsRepositoryPort) => new UpdateAdminTechSkillUseCase(r),
      inject: [AdminTechSkillsRepositoryPort],
    },
    {
      provide: DeleteAdminTechSkillUseCase,
      useFactory: (r: AdminTechSkillsRepositoryPort) => new DeleteAdminTechSkillUseCase(r),
      inject: [AdminTechSkillsRepositoryPort],
    },

    // ----- Spoken languages use cases -----
    {
      provide: ListAdminSpokenLanguagesUseCase,
      useFactory: (r: AdminSpokenLanguagesRepositoryPort) =>
        new ListAdminSpokenLanguagesUseCase(r),
      inject: [AdminSpokenLanguagesRepositoryPort],
    },
    {
      provide: GetAdminSpokenLanguageUseCase,
      useFactory: (r: AdminSpokenLanguagesRepositoryPort) => new GetAdminSpokenLanguageUseCase(r),
      inject: [AdminSpokenLanguagesRepositoryPort],
    },
    {
      provide: CreateAdminSpokenLanguageUseCase,
      useFactory: (r: AdminSpokenLanguagesRepositoryPort) =>
        new CreateAdminSpokenLanguageUseCase(r),
      inject: [AdminSpokenLanguagesRepositoryPort],
    },
    {
      provide: UpdateAdminSpokenLanguageUseCase,
      useFactory: (r: AdminSpokenLanguagesRepositoryPort) =>
        new UpdateAdminSpokenLanguageUseCase(r),
      inject: [AdminSpokenLanguagesRepositoryPort],
    },
    {
      provide: DeleteAdminSpokenLanguageUseCase,
      useFactory: (r: AdminSpokenLanguagesRepositoryPort) =>
        new DeleteAdminSpokenLanguageUseCase(r),
      inject: [AdminSpokenLanguagesRepositoryPort],
    },

    // ----- Programming languages use cases -----
    {
      provide: ListAdminProgrammingLanguagesUseCase,
      useFactory: (r: AdminProgrammingLanguagesRepositoryPort) =>
        new ListAdminProgrammingLanguagesUseCase(r),
      inject: [AdminProgrammingLanguagesRepositoryPort],
    },
    {
      provide: GetAdminProgrammingLanguageUseCase,
      useFactory: (r: AdminProgrammingLanguagesRepositoryPort) =>
        new GetAdminProgrammingLanguageUseCase(r),
      inject: [AdminProgrammingLanguagesRepositoryPort],
    },
    {
      provide: CreateAdminProgrammingLanguageUseCase,
      useFactory: (r: AdminProgrammingLanguagesRepositoryPort) =>
        new CreateAdminProgrammingLanguageUseCase(r),
      inject: [AdminProgrammingLanguagesRepositoryPort],
    },
    {
      provide: UpdateAdminProgrammingLanguageUseCase,
      useFactory: (r: AdminProgrammingLanguagesRepositoryPort) =>
        new UpdateAdminProgrammingLanguageUseCase(r),
      inject: [AdminProgrammingLanguagesRepositoryPort],
    },
    {
      provide: DeleteAdminProgrammingLanguageUseCase,
      useFactory: (r: AdminProgrammingLanguagesRepositoryPort) =>
        new DeleteAdminProgrammingLanguageUseCase(r),
      inject: [AdminProgrammingLanguagesRepositoryPort],
    },
  ],
})
export class AdminCatalogModule {}
