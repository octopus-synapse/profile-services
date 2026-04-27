/**
 * Outbound port for running health checks against the platform's
 * external dependencies. The use case never sees `@nestjs/terminus`
 * or the individual indicators — it asks for a named subset of
 * checks and gets back a domain-typed snapshot.
 *
 * The shape of `HealthSnapshot` mirrors what terminus emits because
 * that's the contract the controller already exposes; adapters do
 * the conversion from `HealthCheckResult`.
 */

export type HealthCheckSystem = 'database' | 'redis' | 'storage' | 'translate' | 'smtp' | 'openai';

export interface HealthCheckEntry {
  readonly status: string;
  readonly message?: string;
  readonly configured?: boolean;
}

export interface HealthSnapshot {
  readonly status: string;
  readonly info?: Record<string, HealthCheckEntry>;
  readonly error?: Record<string, HealthCheckEntry>;
  readonly details?: Record<string, HealthCheckEntry>;
}

export abstract class HealthCheckOrchestratorPort {
  abstract run(systems: readonly HealthCheckSystem[]): Promise<HealthSnapshot>;
}
