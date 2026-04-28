/**
 * Pure-TS wiring for the public-resumes BC. Zero `@nestjs/*` imports —
 * Phase-1 canonical shape: returns `{ useCases, routes }` as a
 * `BoundedContextComposition`.
 *
 * The HTTP-facing bundle aggregates the framework-free
 * `ResumeShareService`, `OgImageService`, `QrCodeService`, and the
 * `AccessPublicResumeUseCase` so the route synthesizer can resolve a
 * single DI token at runtime. The Nest shell (`*.module.ts`) adapts
 * the same composition to Nest's DI graph via `useFactory`.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { CachePort } from '@/shared-kernel/cache/cache.port';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import { PublicResumesHttpBundle } from './application/ports/public-resumes.bundle';
import { AccessPublicResumeUseCase } from './application/use-cases/access-public-resume.use-case';
import { publicResumesRoutes } from './public-resumes.routes';
import { OgImageService } from './services/og-image.service';
import { QrCodeService } from './services/qr-code.service';
import { ResumeShareService } from './services/resume-share.service';

export { PublicResumesHttpBundle };

export interface PublicResumesCompositionDeps {
  readonly prisma: PrismaService;
  readonly cache: CachePort;
  readonly events: EventPublisherPort;
  readonly logger: LoggerPort;
  readonly publicAppUrl: string;
}

export function buildPublicResumesUseCases(
  deps: PublicResumesCompositionDeps,
): PublicResumesHttpBundle {
  const { prisma, cache, events, logger, publicAppUrl } = deps;
  const shareService = new ResumeShareService(prisma, cache, events);
  const ogImageService = new OgImageService();
  const qrCodeService = new QrCodeService();
  const accessResume = new AccessPublicResumeUseCase(shareService, events, logger);

  return {
    shareService,
    accessResume,
    ogImageService,
    qrCodeService,
    publicAppUrl,
  };
}

export function buildPublicResumesComposition(
  deps: PublicResumesCompositionDeps,
): BoundedContextComposition<PublicResumesHttpBundle> {
  return {
    useCases: buildPublicResumesUseCases(deps),
    routes: publicResumesRoutes,
  };
}
