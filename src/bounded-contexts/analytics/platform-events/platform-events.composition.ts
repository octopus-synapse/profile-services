/**
 * Pure-TS wiring for the platform-events submodule. Zero `@nestjs/*`
 * imports.
 *
 * The PostHog forwarder is configured from a structural config-reader
 * (decoupled from `@nestjs/config`) so the composition can be reused by
 * the Elysia bootstrap with a `ProcessEnvConfigAdapter`.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { TrackPlatformEventsUseCase } from './application/use-cases/track-platform-events/track-platform-events.use-case';
import { PostHogProductAnalyticsForwarder } from './infrastructure/adapters/external-services/posthog-product-analytics.forwarder';
import { PrismaPlatformEventsRepository } from './infrastructure/adapters/persistence/prisma-platform-events.repository';
import { platformEventsRoutes } from './platform-events.routes';

export { TrackPlatformEventsUseCase };

/** Minimal structural shape of the bits we need from `ConfigService`. */
export interface PlatformEventsConfigReader {
  get<T = string>(key: string): T | undefined;
}

export function buildPlatformEventsUseCases(
  prisma: PrismaService,
  logger: LoggerPort,
  config: PlatformEventsConfigReader,
): TrackPlatformEventsUseCase {
  const repository = new PrismaPlatformEventsRepository(prisma, logger);
  const forwarder = new PostHogProductAnalyticsForwarder(
    {
      host: config.get<string>('POSTHOG_HOST'),
      apiKey: config.get<string>('POSTHOG_API_KEY'),
    },
    logger,
  );
  return new TrackPlatformEventsUseCase(repository, forwarder, logger);
}

export function buildPlatformEventsComposition(
  prisma: PrismaService,
  logger: LoggerPort,
  config: PlatformEventsConfigReader,
): BoundedContextComposition<TrackPlatformEventsUseCase> {
  return {
    useCases: buildPlatformEventsUseCases(prisma, logger, config),
    routes: platformEventsRoutes,
  };
}
