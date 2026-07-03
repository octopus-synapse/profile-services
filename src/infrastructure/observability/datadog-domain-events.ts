import type { DomainEvent, EventBusPort } from '@/shared-kernel/event-bus';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';
import type { DatadogTelemetryService } from './datadog-telemetry.service';

const TRACKED_EVENT_TYPES = [
  'resume.created',
  'resume.updated',
  'resume.section.added',
  'resume.section.updated',
  'resume.deleted',
  'identity.user.registered',
  'auth.user.logged_in',
  'auth.login.failed',
  'auth.user.logged_out',
  'export.requested',
  'export.completed',
  'export.failed',
  'scoring.match.computed',
  'scoring.resume-quality.computed',
  'jobs.application-submitted',
  'identity.authorization.role.assigned',
  'identity.authorization.role.revoked',
  'identity.authorization.permission.granted',
  'identity.authorization.permission.revoked',
  'identity.authorization.permission.denied',
  'platform.feature_flag.toggled',
] as const;

export function registerDatadogDomainEvents(
  eventBus: EventBusPort,
  telemetry: DatadogTelemetryService,
  logger: LoggerPort,
): void {
  if (!telemetry.enabled) return;
  for (const eventType of TRACKED_EVENT_TYPES) {
    eventBus.on(eventType, (event: DomainEvent) => {
      telemetry.recordDomainEvent(event);
    });
  }
  logger.log(
    `Datadog domain telemetry registered for ${TRACKED_EVENT_TYPES.length} events`,
    'DatadogTelemetry',
  );
}
