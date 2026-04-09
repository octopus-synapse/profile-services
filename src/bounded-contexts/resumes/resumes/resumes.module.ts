import { Module } from '@nestjs/common';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeVersionsModule } from '@/bounded-contexts/resumes/resume-versions/resume-versions.module';
import { ResumeVersionService } from '@/bounded-contexts/resumes/resume-versions/services/resume-version.service';
import {
  CleanupResumesOnUserDeleteHandler,
  InvalidateCacheOnResumeDelete,
  InvalidateCacheOnResumeUpdate,
} from '../application/handlers';
import { RESUME_EVENT_PUBLISHER } from '../domain/ports';
import { ResumeEventPublisherAdapter } from '../infrastructure/adapters';
import { GenericResumeSectionsController } from './controllers';
import { ResumeManagementController } from './controllers/resume-management.controller';
import { ResumeVersionServicePort } from './ports/resume-version-service.port';
import { ResumesRepositoryPort } from './ports/resumes-repository.port';
import { ResumesServicePort } from './ports/resumes-service.port';
import { ResumesController } from './resumes.controller';
import { ResumesRepository } from './resumes.repository';
import { ResumesService } from './resumes.service';
import { GenericResumeSectionsService, SectionDefinitionZodFactory } from './services';
import {
  buildGenericResumeSectionsUseCases,
  GENERIC_RESUME_SECTIONS_USE_CASES,
} from './services/generic-resume-sections/generic-resume-sections.composition';
import {
  buildResumeManagementUseCases,
  RESUME_MANAGEMENT_USE_CASES,
} from './services/resume-management/resume-management.composition';
import { ResumeManagementService } from './services/resume-management.service';

@Module({
  imports: [PrismaModule, ResumeVersionsModule, CacheModule],
  controllers: [ResumesController, ResumeManagementController, GenericResumeSectionsController],
  providers: [
    ResumesService,
    ResumesRepository,
    // Port bindings
    {
      provide: ResumesServicePort,
      useExisting: ResumesService,
    },
    {
      provide: ResumesRepositoryPort,
      useExisting: ResumesRepository,
    },
    {
      provide: ResumeVersionServicePort,
      useExisting: ResumeVersionService,
    },
    ResumeManagementService,
    GenericResumeSectionsService,
    SectionDefinitionZodFactory,
    {
      provide: GENERIC_RESUME_SECTIONS_USE_CASES,
      useFactory: buildGenericResumeSectionsUseCases,
      inject: [PrismaService, SectionDefinitionZodFactory],
    },
    {
      provide: RESUME_MANAGEMENT_USE_CASES,
      useFactory: buildResumeManagementUseCases,
      inject: [PrismaService, RESUME_EVENT_PUBLISHER],
    },
    // Event Handlers
    InvalidateCacheOnResumeUpdate,
    InvalidateCacheOnResumeDelete,
    CleanupResumesOnUserDeleteHandler,
    // Port Adapters
    {
      provide: RESUME_EVENT_PUBLISHER,
      useClass: ResumeEventPublisherAdapter,
    },
  ],
  exports: [
    ResumesService,
    ResumesRepository,
    ResumeManagementService,
    GenericResumeSectionsService,
  ],
})
export class ResumesModule {}
