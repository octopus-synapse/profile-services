/**
 * Idempotently inserts the canonical `SUBMITTED` timeline event for a
 * freshly created application. The jobs slice calls this right after
 * creating a `JobApplication` row so the tracker timeline always
 * starts with the "enviada" marker — even when the row was inserted
 * directly (seeders, admin imports, etc.).
 *
 * The repository absorbs the existence check; calling this twice with
 * the same `applicationId` is a no-op. `occurredAt` defaults to "now"
 * but callers typically pass `application.createdAt` so the timeline
 * lines up with the actual submission time.
 */

import { ApplicationTrackerPort } from '../../../domain/ports/application-tracker.port';
import { ApplicationTrackerRepositoryPort } from '../../../domain/ports/application-tracker.repository.port';

export class EnsureSubmittedEventUseCase extends ApplicationTrackerPort {
  constructor(private readonly repository: ApplicationTrackerRepositoryPort) {
    super();
  }

  async execute(applicationId: string, occurredAt?: Date): Promise<void> {
    await this.repository.ensureSubmittedEvent(applicationId, occurredAt ?? new Date());
  }

  // Implements ApplicationTrackerPort so the catalog slice's
  // ApplyToJob use case can depend on the port directly.
  ensureSubmittedEvent(applicationId: string, occurredAt?: Date): Promise<void> {
    return this.execute(applicationId, occurredAt);
  }
}
