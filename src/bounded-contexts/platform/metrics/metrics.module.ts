import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AdminMetricsController } from './admin-metrics.controller';
import { ScoreMetricsHandler } from './handlers/score-metrics.handler';
import { MetricsController } from './metrics.controller';
import { MetricsGuard } from './metrics.guard';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  controllers: [MetricsController, AdminMetricsController],
  providers: [
    MetricsService,
    MetricsGuard,
    ScoreMetricsHandler,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
