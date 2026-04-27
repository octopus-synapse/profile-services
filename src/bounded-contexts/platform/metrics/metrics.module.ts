/**
 * Metrics Module
 *
 * ADR-001: the two HTTP surfaces go through POJO use cases that
 * read from `MetricsReaderPort`. The `MetricsService` extends the
 * port and is exported as-is for the rest of the platform — the
 * recording API (incrementResumeCreated, observeApiLatency, …) is
 * still infrastructure shared globally.
 */

import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { GetMetricsOverviewUseCase } from './application/use-cases/get-metrics-overview/get-metrics-overview.use-case';
import { GetPrometheusMetricsUseCase } from './application/use-cases/get-prometheus-metrics/get-prometheus-metrics.use-case';
import { MetricsReaderPort } from './domain/ports/metrics-reader.port';
import { ScoreMetricsHandler } from './handlers/score-metrics.handler';
import { AdminMetricsController } from './infrastructure/controllers/admin-metrics.controller';
import { MetricsController } from './infrastructure/controllers/metrics.controller';
import { MetricsGuard } from './metrics.guard';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  controllers: [MetricsController, AdminMetricsController],
  providers: [
    MetricsService,
    { provide: MetricsReaderPort, useExisting: MetricsService },
    {
      provide: GetPrometheusMetricsUseCase,
      useFactory: (reader: MetricsReaderPort) => new GetPrometheusMetricsUseCase(reader),
      inject: [MetricsReaderPort],
    },
    {
      provide: GetMetricsOverviewUseCase,
      useFactory: (reader: MetricsReaderPort) => new GetMetricsOverviewUseCase(reader),
      inject: [MetricsReaderPort],
    },
    MetricsGuard,
    ScoreMetricsHandler,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
