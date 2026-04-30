/**
 * Domain shape for one product event flowing through the ingestion
 * pipeline. Both the persistence port and the forwarder port consume
 * this shape — adapters convert it to whatever the underlying system
 * (Prisma row, PostHog batch entry, …) expects.
 */
export interface PlatformEvent {
  readonly userId: string | null;
  readonly event: string;
  readonly props: Record<string, unknown> | null;
  readonly occurredAt: Date;
}
