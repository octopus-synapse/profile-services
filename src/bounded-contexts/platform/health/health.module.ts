/**
 * Health Module
 *
 * ADR-001: terminus indicators stay as Nest-friendly probe adapters
 * but the controller now talks to a `RunHealthCheckUseCase` POJO.
 * The orchestrator port wraps `HealthCheckService` so the use case
 * never imports `@nestjs/terminus`.
 */

import { Module } from '@nestjs/common';
import { HealthCheckService, TerminusModule } from '@nestjs/terminus';
import { UploadModule } from '@/bounded-contexts/integration/upload/upload.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { TranslationModule } from '@/bounded-contexts/translation';
import { RunHealthCheckUseCase } from './application/use-cases/run-health-check/run-health-check.use-case';
import { HealthCheckOrchestratorPort } from './domain/ports/health-check-orchestrator.port';
import {
  DatabaseHealthIndicator,
  OpenAIHealthIndicator,
  RedisHealthIndicator,
  SmtpHealthIndicator,
  StorageHealthIndicator,
  TranslateHealthIndicator,
} from './indicators';
import { TerminusHealthCheckOrchestrator } from './infrastructure/adapters/external-services/terminus-health-check.orchestrator';
import { HealthController } from './infrastructure/controllers/health.controller';

@Module({
  imports: [TerminusModule, PrismaModule, UploadModule, TranslationModule],
  controllers: [HealthController],
  providers: [
    DatabaseHealthIndicator,
    RedisHealthIndicator,
    StorageHealthIndicator,
    TranslateHealthIndicator,
    SmtpHealthIndicator,
    OpenAIHealthIndicator,
    {
      provide: HealthCheckOrchestratorPort,
      useFactory: (
        health: HealthCheckService,
        db: DatabaseHealthIndicator,
        redis: RedisHealthIndicator,
        storage: StorageHealthIndicator,
        translate: TranslateHealthIndicator,
        smtp: SmtpHealthIndicator,
        openai: OpenAIHealthIndicator,
      ) => new TerminusHealthCheckOrchestrator(health, db, redis, storage, translate, smtp, openai),
      inject: [
        HealthCheckService,
        DatabaseHealthIndicator,
        RedisHealthIndicator,
        StorageHealthIndicator,
        TranslateHealthIndicator,
        SmtpHealthIndicator,
        OpenAIHealthIndicator,
      ],
    },
    {
      provide: RunHealthCheckUseCase,
      useFactory: (orchestrator: HealthCheckOrchestratorPort) =>
        new RunHealthCheckUseCase(orchestrator),
      inject: [HealthCheckOrchestratorPort],
    },
  ],
})
export class HealthModule {}
