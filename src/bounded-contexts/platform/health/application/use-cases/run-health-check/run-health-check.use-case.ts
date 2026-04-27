/**
 * Runs the requested subset of platform health checks. The use case
 * is parametrized by system list so the controller can serve the
 * `/health` (all systems) and `/health/<system>` endpoints without
 * needing one use case per probe.
 */

import {
  HealthCheckOrchestratorPort,
  type HealthCheckSystem,
  type HealthSnapshot,
} from '../../../domain/ports/health-check-orchestrator.port';

const ALL_SYSTEMS: readonly HealthCheckSystem[] = [
  'database',
  'redis',
  'storage',
  'translate',
  'smtp',
  'openai',
];

export class RunHealthCheckUseCase {
  constructor(private readonly orchestrator: HealthCheckOrchestratorPort) {}

  async execute(systems?: readonly HealthCheckSystem[]): Promise<HealthSnapshot> {
    return this.orchestrator.run(systems ?? ALL_SYSTEMS);
  }
}
