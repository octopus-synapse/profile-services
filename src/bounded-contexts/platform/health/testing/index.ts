/**
 * In-memory orchestrator for the health-check use case spec. Records
 * which systems were asked for and returns whatever snapshot the test
 * seeded — the use case stays ignorant of terminus.
 */

import {
  HealthCheckOrchestratorPort,
  type HealthCheckSystem,
  type HealthSnapshot,
} from '../domain/ports/health-check-orchestrator.port';

export class InMemoryHealthCheckOrchestrator extends HealthCheckOrchestratorPort {
  readonly calls: HealthCheckSystem[][] = [];
  private snapshot: HealthSnapshot = { status: 'ok', info: {}, details: {} };

  seedSnapshot(snapshot: HealthSnapshot): void {
    this.snapshot = snapshot;
  }

  async run(systems: readonly HealthCheckSystem[]): Promise<HealthSnapshot> {
    this.calls.push([...systems]);
    return this.snapshot;
  }
}
