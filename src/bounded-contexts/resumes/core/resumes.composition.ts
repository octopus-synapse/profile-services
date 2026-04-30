/**
 * Pure-TS wiring for the resumes/core BC. Zero `@nestjs/*` imports.
 *
 * Phase-1 canonical shape: `buildResumesCoreComposition(...)` returns
 * `{ useCases, routes, eventHandlers }` for the Elysia bootstrap. The
 * Nest shell (`*.module.ts`) adapts the same composition to Nest's DI
 * graph.
 *
 * The BC drives three separate route bundles:
 *  - `ResumesUseCases` — primary CRUD + slot lookup (the canonical
 *    `useCases` of the composition).
 *  - `ResumeManagementUseCases` — elevated admin-style ops, returned
 *    via the `extras.management` field.
 *  - `GenericResumeSectionsUseCases` — nested resume sections, returned
 *    via the `extras.genericSections` field.
 *
 * Event handlers (cache invalidation + cleanup-on-user-delete) are
 * surfaced through the canonical `eventHandlers` array — the bootstrap
 * registers them with `EventBusPort.on(...)`.
 */

import { UserDeletedEvent } from '@/bounded-contexts/identity/shared-kernel/domain/events';
import type { CacheInvalidationService } from '@/bounded-contexts/platform/common/cache/services/cache-invalidation.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeDeletedEvent, ResumeUpdatedEvent } from '@/bounded-contexts/resumes/domain/events';
import type { ResumeEventPublisher } from '@/bounded-contexts/resumes/domain/ports';
import type { LoggerPort } from '@/shared-kernel';
import type { BcEventBinding, BoundedContextComposition } from '@/shared-kernel/composition';
import { CleanupResumesOnUserDeleteHandler } from '../application/handlers/cleanup-resumes-on-user-delete.handler';
import { InvalidateCacheOnResumeDelete } from '../application/handlers/invalidate-cache-on-resume-delete.handler';
import { InvalidateCacheOnResumeUpdate } from '../application/handlers/invalidate-cache-on-resume-update.handler';
import { ResumesUseCases } from './application/ports/resumes-use-cases.port';
import { buildResumesUseCases } from './application/resumes.composition';
import { ResumesRepository } from './resumes.repository';
import {
  genericResumeSectionsRoutes,
  resumeManagementRoutes,
  resumesRoutes,
} from './resumes.routes';
import { ResumesService } from './resumes.service';
import {
  GenericResumeSectionsService,
  ResumeManagementService,
  SectionDefinitionZodFactory,
} from './services';
import { buildGenericResumeSectionsUseCases } from './services/generic-resume-sections/generic-resume-sections.composition';
import { GenericResumeSectionsUseCases } from './services/generic-resume-sections/ports/generic-resume-sections-repository.port';
import { ResumeManagementUseCases } from './services/resume-management/ports/resume-management.port';
import { buildResumeManagementUseCases } from './services/resume-management/resume-management.composition';

export {
  GenericResumeSectionsService,
  GenericResumeSectionsUseCases,
  ResumeManagementService,
  ResumeManagementUseCases,
  ResumesRepository,
  ResumesService,
  ResumesUseCases,
};

/**
 * Extras carried alongside the canonical `BoundedContextComposition`.
 * The bootstrap mounts each as a separate route group because the
 * synthesizer is typed against a single bundle per group.
 */
export interface ResumesCoreCompositionExtras {
  readonly management: {
    readonly useCases: ResumeManagementUseCases;
    readonly routes: typeof resumeManagementRoutes;
    readonly service: ResumeManagementService;
  };
  readonly genericSections: {
    readonly useCases: GenericResumeSectionsUseCases;
    readonly routes: typeof genericResumeSectionsRoutes;
    readonly service: GenericResumeSectionsService;
  };
  readonly repository: ResumesRepository;
  readonly service: ResumesService;
}

export function buildResumesCoreComposition(
  prisma: PrismaService,
  versionService: import('./ports/resume-version-service.port').ResumeVersionServicePort,
  eventPublisher: ResumeEventPublisher,
  cacheInvalidation: CacheInvalidationService,
  logger: LoggerPort,
): BoundedContextComposition<ResumesUseCases> & ResumesCoreCompositionExtras {
  const repository = new ResumesRepository(prisma, logger);
  const service = new ResumesService(repository, versionService, eventPublisher);

  const useCases = buildResumesUseCases(repository, versionService, eventPublisher, logger);

  // Resume Management (elevated permissions) bundle.
  const managementUseCases = buildResumeManagementUseCases(prisma, eventPublisher);
  const managementService = new ResumeManagementService(managementUseCases);

  // Generic Resume Sections bundle.
  const sectionSchemaFactory = new SectionDefinitionZodFactory();
  const genericSectionsUseCases = buildGenericResumeSectionsUseCases(
    prisma,
    sectionSchemaFactory,
    logger,
  );
  const genericSectionsService = new GenericResumeSectionsService(genericSectionsUseCases);

  // --- Event handlers (POJO @OnEvent replacements) ---
  const onResumeUpdated = new InvalidateCacheOnResumeUpdate(cacheInvalidation, logger);
  const onResumeDeleted = new InvalidateCacheOnResumeDelete(cacheInvalidation, logger);
  const onUserDeleted = new CleanupResumesOnUserDeleteHandler(prisma, logger);

  const eventHandlers: ReadonlyArray<BcEventBinding> = [
    {
      eventType: ResumeUpdatedEvent.TYPE,
      handler: onResumeUpdated.handle.bind(onResumeUpdated),
    },
    {
      eventType: ResumeDeletedEvent.TYPE,
      handler: onResumeDeleted.handle.bind(onResumeDeleted),
    },
    {
      eventType: UserDeletedEvent.TYPE,
      handler: onUserDeleted.handle.bind(onUserDeleted),
    },
  ];

  return {
    useCases,
    routes: resumesRoutes,
    eventHandlers,
    repository,
    service,
    management: {
      useCases: managementUseCases,
      routes: resumeManagementRoutes,
      service: managementService,
    },
    genericSections: {
      useCases: genericSectionsUseCases,
      routes: genericResumeSectionsRoutes,
      service: genericSectionsService,
    },
  };
}
