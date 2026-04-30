/**
 * Outbound port for the canonical platform-event audit trail.
 *
 * The use case writes every accepted event here; the adapter is
 * Prisma-backed today but could be anything (Kafka, Kinesis, …)
 * tomorrow. `persist` returns the number of rows actually written
 * so the API can echo it back to the client.
 */

import type { PlatformEvent } from '../entities/platform-event';

export abstract class PlatformEventsRepositoryPort {
  abstract persist(events: readonly PlatformEvent[]): Promise<{ accepted: number }>;
}
