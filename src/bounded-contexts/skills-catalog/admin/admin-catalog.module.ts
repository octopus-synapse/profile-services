import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { AdminProgrammingLanguagesController } from './admin-programming-languages.controller';
import { AdminProgrammingLanguagesService } from './admin-programming-languages.service';
import { AdminSpokenLanguagesController } from './admin-spoken-languages.controller';
import { AdminSpokenLanguagesService } from './admin-spoken-languages.service';
import { AdminTechAreasController } from './admin-tech-areas.controller';
import { AdminTechAreasService } from './admin-tech-areas.service';
import { AdminTechNichesController } from './admin-tech-niches.controller';
import { AdminTechNichesService } from './admin-tech-niches.service';
import { AdminTechSkillsController } from './admin-tech-skills.controller';
import { AdminTechSkillsService } from './admin-tech-skills.service';

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
    AdminTechAreasService,
    AdminTechNichesService,
    AdminTechSkillsService,
    AdminSpokenLanguagesService,
    AdminProgrammingLanguagesService,
  ],
})
export class AdminCatalogModule {}
