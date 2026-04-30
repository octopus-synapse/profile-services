import type { Probe } from '../domain/probe.port';

/**
 * Token + bundle the route synthesizer resolves to dispatch the
 * `/api/health/*` endpoints. The bundle is a flat record of named
 * probes — composition wires one probe per backend.
 */
export abstract class HealthUseCases {
  abstract readonly probes: ReadonlyArray<Probe>;
  abstract readonly version: string;
  abstract readonly startedAt: Date;
}
