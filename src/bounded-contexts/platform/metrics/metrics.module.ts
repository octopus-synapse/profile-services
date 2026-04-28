/**
 * Metrics Module
 *
 * Thin Nest shell. The `MetricsService` (recording API + reader) and
 * the global interceptor stay Nest-decorated; the read use cases are
 * routed through `metrics.composition.ts`.
 */

import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { EventBusPort, LoggerPort } from '@/shared-kernel';
import { MetricsUseCases } from './application/ports/metrics.port';
import { MetricsReaderPort } from './domain/ports/metrics-reader.port';
import { registerMetricsHandlers } from './handlers/register-handlers';
import { buildMetricsUseCases } from './metrics.composition';
import { MetricsGuard } from './metrics.guard';
import { MetricsInterceptor } from './metrics.interceptor';
import { metricsRoutes } from './metrics.routes';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  controllers: [
    ...synthesizeRouteControllers(MetricsUseCases, metricsRoutes, {
      guards: { 'metrics-key': { guard: MetricsGuard } },
    }),
  ],
  providers: [
    MetricsService,
    {
      provide: 'METRICS_SERVICE_INIT',
      useFactory: async (svc: MetricsService) => {
        await svc.init?.();
        return true;
      },
      inject: [MetricsService],
    },
    { provide: MetricsReaderPort, useExisting: MetricsService },
    {
      provide: MetricsUseCases,
      useFactory: (reader: MetricsReaderPort) => buildMetricsUseCases(reader),
      inject: [MetricsReaderPort],
    },
    MetricsGuard,
    {
      provide: 'METRICS_HANDLERS_REGISTERED',
      useFactory: (eventBus: EventBusPort, metrics: MetricsService, logger: LoggerPort): boolean => {
        registerMetricsHandlers({ eventBus, metrics, logger });
        return true;
      },
      inject: [EventBusPort, MetricsService, LoggerPort],
    },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
