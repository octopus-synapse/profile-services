/**
 * Metrics Module
 *
 * Thin Nest shell. The `MetricsService` (recording API + reader) and
 * the global interceptor stay Nest-decorated; the read use cases are
 * routed through `metrics.composition.ts`.
 */

import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsUseCases } from './application/ports/metrics.port';
import { MetricsReaderPort } from './domain/ports/metrics-reader.port';
import { ScoreMetricsHandler } from './handlers/score-metrics.handler';
import { AdminMetricsController } from './infrastructure/controllers/admin-metrics.controller';
import { MetricsController } from './infrastructure/controllers/metrics.controller';
import { MetricsGuard } from './metrics.guard';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';
import { buildMetricsUseCases } from './metrics.composition';

@Global()
@Module({
  controllers: [MetricsController, AdminMetricsController],
  providers: [
    MetricsService,
    { provide: MetricsReaderPort, useExisting: MetricsService },
    {
      provide: MetricsUseCases,
      useFactory: (reader: MetricsReaderPort) => buildMetricsUseCases(reader),
      inject: [MetricsReaderPort],
    },
    MetricsGuard,
    ScoreMetricsHandler,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
