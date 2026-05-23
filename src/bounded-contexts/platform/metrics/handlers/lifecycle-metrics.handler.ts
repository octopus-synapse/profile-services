/**
 * Lifecycle metrics handler — wires the 5 dormant Prometheus signals
 * declared in `metrics-registry.factory.ts` to the domain events that
 * generate them. Before this handler the metrics existed in the
 * registry but `.inc()` / `.set()` was never called from anywhere, so
 * the dashboards always read zero (P1-023).
 *
 * Coverage:
 *   - `resume_created_total`   ← `ResumeCreatedEvent`
 *   - `user_signup_total`      ← `UserRegisteredEvent`
 *   - `active_users_total`     ← `UserLoggedInEvent` / `UserLoggedOutEvent`
 *   - `pending_exports_total`  ← `ExportRequested/Completed/FailedEvent`
 *
 * `api_latency_seconds` is observed in the HTTP pipeline (not here);
 * latency belongs to the request lifecycle, not the domain bus.
 */

import {
  ExportCompletedEvent,
  ExportFailedEvent,
  ExportRequestedEvent,
} from '@/bounded-contexts/export/domain/events';
import {
  UserLoggedInEvent,
  UserLoggedOutEvent,
} from '@/bounded-contexts/identity/authentication/domain/events';
import { UserRegisteredEvent } from '@/bounded-contexts/identity/shared-kernel/domain/events/user-registered.event';
import { ResumeCreatedEvent } from '@/bounded-contexts/resumes/domain/events/resume-created.event';
import type { LoggerPort } from '@/shared-kernel/logger';
import type { MetricsService } from '../metrics.service';

export class LifecycleMetricsHandler {
  // `logger` is unused today but injected per the
  // `logger-coverage.spec.ts` ratchet (handler files must accept a
  // `LoggerPort`) so future debug breadcrumbs don't need a wiring
  // change. Reference once below to keep biome happy.
  constructor(
    private readonly metrics: MetricsService,
    private readonly logger: LoggerPort,
  ) {
    void this.logger;
  }

  onResumeCreated(_event: ResumeCreatedEvent): void {
    // Templates aren't always known at creation time (resume-versions /
    // imports skip the templateId), so don't label by it; aggregate is
    // good enough for the dashboard.
    this.metrics.incrementResumeCreated();
  }

  onUserRegistered(_event: UserRegisteredEvent): void {
    // `method` label would let us split signup channels (password,
    // oauth, etc.) once those events carry it; today only password
    // signup emits this event, so leave the label empty.
    this.metrics.incrementUserSignup();
  }

  onUserLoggedIn(_event: UserLoggedInEvent): void {
    this.metrics.incrementActiveUsers();
  }

  onUserLoggedOut(_event: UserLoggedOutEvent): void {
    this.metrics.decrementActiveUsers();
  }

  onExportRequested(_event: ExportRequestedEvent): void {
    this.metrics.incrementPendingExports();
  }

  onExportCompleted(_event: ExportCompletedEvent): void {
    this.metrics.decrementPendingExports();
  }

  onExportFailed(_event: ExportFailedEvent): void {
    this.metrics.decrementPendingExports();
  }
}
