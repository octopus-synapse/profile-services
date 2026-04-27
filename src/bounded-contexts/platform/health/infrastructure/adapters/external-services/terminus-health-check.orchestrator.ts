/**
 * Terminus-backed implementation of `HealthCheckOrchestratorPort`.
 *
 * Owns the mapping from `HealthCheckSystem` names to the registered
 * Nest indicators and delegates aggregation to terminus's
 * `HealthCheckService`. The result already matches the snapshot
 * shape one-to-one, so we cast through.
 */

import { HealthCheckService } from '@nestjs/terminus';
import {
  type HealthCheckSystem,
  HealthCheckOrchestratorPort,
  type HealthSnapshot,
} from '../../../domain/ports/health-check-orchestrator.port';
import {
  DatabaseHealthIndicator,
  OpenAIHealthIndicator,
  RedisHealthIndicator,
  SmtpHealthIndicator,
  StorageHealthIndicator,
  TranslateHealthIndicator,
} from '../../../indicators';

export class TerminusHealthCheckOrchestrator extends HealthCheckOrchestratorPort {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly storage: StorageHealthIndicator,
    private readonly translate: TranslateHealthIndicator,
    private readonly smtp: SmtpHealthIndicator,
    private readonly openai: OpenAIHealthIndicator,
  ) {
    super();
  }

  async run(systems: readonly HealthCheckSystem[]): Promise<HealthSnapshot> {
    const checks = systems.map((system) => () => {
      switch (system) {
        case 'database':
          return this.db.isHealthy('database');
        case 'redis':
          return this.redis.isHealthy('redis');
        case 'storage':
          return this.storage.isHealthy('storage');
        case 'translate':
          return this.translate.isHealthy('translate');
        case 'smtp':
          return this.smtp.isHealthy('smtp');
        case 'openai':
          return this.openai.isHealthy('openai');
      }
    });
    return this.health.check(checks) as Promise<HealthSnapshot>;
  }
}
