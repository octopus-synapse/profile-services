/**
 * Outbound port the catalog slice uses to notify the application
 * tracker that an application has been submitted. The tracker uses
 * this SUBMITTED event as the anchor for silence detection and company
 * response percentiles.
 *
 * Lives here (not in `tracker/`) so the catalog use cases stay free of
 * cross-slice imports — the module wires it to the tracker service.
 */

export abstract class ApplicationTrackerPort {
  abstract ensureSubmittedEvent(applicationId: string, occurredAt?: Date): Promise<void>;
}
