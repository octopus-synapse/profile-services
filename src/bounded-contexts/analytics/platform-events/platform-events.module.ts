/**
 * Platform Events Module
 *
 * ADR-001: the use case is a POJO orchestrator that depends on two
 * outbound ports (persistence + product-analytics forwarder) and a
 * LoggerPort. Both ports are wired here via useFactory so the use
 * case never sees Prisma, ConfigService, or fetch.
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { TrackPlatformEventsUseCase } from './application/use-cases/track-platform-events/track-platform-events.use-case';
import { PlatformEventsRepositoryPort } from './domain/ports/platform-events.repository.port';
import { ProductAnalyticsForwarderPort } from './domain/ports/product-analytics-forwarder.port';
import { PostHogProductAnalyticsForwarder } from './infrastructure/adapters/external-services/posthog-product-analytics.forwarder';
import { PrismaPlatformEventsRepository } from './infrastructure/adapters/persistence/prisma-platform-events.repository';
import { PlatformEventsController } from './infrastructure/controllers/platform-events.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [PlatformEventsController],
  providers: [
    {
      provide: PlatformEventsRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaPlatformEventsRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: ProductAnalyticsForwarderPort,
      useFactory: (config: ConfigService, logger: LoggerPort) =>
        new PostHogProductAnalyticsForwarder(
          {
            host: config.get<string>('POSTHOG_HOST'),
            apiKey: config.get<string>('POSTHOG_API_KEY'),
          },
          logger,
        ),
      inject: [ConfigService, LoggerPort],
    },
    {
      provide: TrackPlatformEventsUseCase,
      useFactory: (
        repo: PlatformEventsRepositoryPort,
        forwarder: ProductAnalyticsForwarderPort,
        logger: LoggerPort,
      ) => new TrackPlatformEventsUseCase(repo, forwarder, logger),
      inject: [PlatformEventsRepositoryPort, ProductAnalyticsForwarderPort, LoggerPort],
    },
  ],
})
export class PlatformEventsModule {}
