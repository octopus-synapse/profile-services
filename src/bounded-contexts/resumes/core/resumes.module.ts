import { Module } from '@nestjs/common';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeVersionService } from '@/bounded-contexts/resumes/resume-versions/application/services/resume-version.service';
import { ResumeVersionsModule } from '@/bounded-contexts/resumes/resume-versions/resume-versions.module';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { EventPublisher, LoggerPort } from '@/shared-kernel';
import {
  CleanupResumesOnUserDeleteHandler,
  InvalidateCacheOnResumeDelete,
  InvalidateCacheOnResumeUpdate,
} from '../application/handlers';
import { ResumeEventPublisher } from '../domain/ports/resume-event-publisher.port';
import { ResumeEventPublisherAdapter } from '../infrastructure/adapters';
import { ResumesUseCases } from './application/ports/resumes-use-cases.port';
import { buildResumesUseCases } from './application/resumes.composition';
import { ResumeVersionServicePort } from './ports/resume-version-service.port';
import { ResumesRepositoryPort } from './ports/resumes-repository.port';
import { ResumesServicePort } from './ports/resumes-service.port';
import { ResumesRepository } from './resumes.repository';
import {
  genericResumeSectionsRoutes,
  resumeManagementRoutes,
  resumesRoutes,
} from './resumes.routes';
import { ResumesService } from './resumes.service';
import { GenericResumeSectionsService, SectionDefinitionZodFactory } from './services';
import { buildGenericResumeSectionsUseCases } from './services/generic-resume-sections/generic-resume-sections.composition';
import { GenericResumeSectionsUseCases } from './services/generic-resume-sections/ports/generic-resume-sections-repository.port';
import { ResumeManagementUseCases } from './services/resume-management/ports/resume-management.port';
import { buildResumeManagementUseCases } from './services/resume-management/resume-management.composition';
import { ResumeManagementService } from './services/resume-management.service';

@Module({
  imports: [PrismaModule, ResumeVersionsModule, CacheModule],
  controllers: [
    ...synthesizeRouteControllers(ResumesUseCases, resumesRoutes),
    ...synthesizeRouteControllers(ResumeManagementUseCases, resumeManagementRoutes),
    ...synthesizeRouteControllers(GenericResumeSectionsUseCases, genericResumeSectionsRoutes),
  ],
  providers: [
    {
      provide: ResumesService,
      useFactory: (
        repository: ResumesRepositoryPort,
        versionService: ResumeVersionServicePort,
        eventPublisher: ResumeEventPublisher,
      ) => new ResumesService(repository, versionService, eventPublisher),
      inject: [ResumesRepositoryPort, ResumeVersionServicePort, ResumeEventPublisher],
    },
    {
      provide: ResumesRepository,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new ResumesRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    // Port bindings
    { provide: ResumesServicePort, useExisting: ResumesService },
    { provide: ResumesRepositoryPort, useExisting: ResumesRepository },
    { provide: ResumeVersionServicePort, useExisting: ResumeVersionService },
    {
      provide: ResumesUseCases,
      useFactory: (
        repository: ResumesRepositoryPort,
        versionService: ResumeVersionServicePort,
        eventPublisher: ResumeEventPublisher,
        logger: LoggerPort,
      ) => buildResumesUseCases(repository, versionService, eventPublisher, logger),
      inject: [ResumesRepositoryPort, ResumeVersionServicePort, ResumeEventPublisher, LoggerPort],
    },
    {
      provide: ResumeManagementService,
      useFactory: (useCases: ResumeManagementUseCases) => new ResumeManagementService(useCases),
      inject: [ResumeManagementUseCases],
    },
    {
      provide: GenericResumeSectionsService,
      useFactory: (useCases: GenericResumeSectionsUseCases) =>
        new GenericResumeSectionsService(useCases),
      inject: [GenericResumeSectionsUseCases],
    },
    { provide: SectionDefinitionZodFactory, useFactory: () => new SectionDefinitionZodFactory() },
    {
      provide: GenericResumeSectionsUseCases,
      useFactory: buildGenericResumeSectionsUseCases,
      inject: [PrismaService, SectionDefinitionZodFactory, LoggerPort],
    },
    {
      provide: ResumeManagementUseCases,
      useFactory: buildResumeManagementUseCases,
      inject: [PrismaService, ResumeEventPublisher],
    },
    // Event Handlers
    InvalidateCacheOnResumeUpdate,
    InvalidateCacheOnResumeDelete,
    CleanupResumesOnUserDeleteHandler,
    // Port Adapters
    {
      provide: ResumeEventPublisher,
      useFactory: (eventPublisher: EventPublisher) =>
        new ResumeEventPublisherAdapter(eventPublisher),
      inject: [EventPublisher],
    },
  ],
  exports: [
    ResumesService,
    ResumesRepository,
    ResumeManagementService,
    GenericResumeSectionsService,
  ],
})
export class ResumesCoreModule {}
