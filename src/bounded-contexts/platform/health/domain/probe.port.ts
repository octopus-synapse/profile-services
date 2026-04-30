/**
 * Generic readiness probe contract. Each backend (Prisma, Redis, queues,
 * etc.) implements one. The route handler runs every probe in parallel
 * with a 2s ceiling and aggregates the results.
 */

export type ProbeStatus = 'ok' | 'degraded' | 'down';

export interface ProbeResult {
  readonly name: string;
  readonly status: ProbeStatus;
  readonly latencyMs: number;
  readonly detail?: string;
}

export type Probe = () => Promise<ProbeResult>;
