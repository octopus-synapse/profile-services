/**
 * Audit handler for authentication / session lifecycle events (P1-035).
 *
 * Subscribes to:
 *   - `LoginFailedEvent`
 *   - `UserLoggedInEvent`
 *   - `UserLoggedOutEvent`
 *   - `SessionCreatedEvent`
 *   - `SessionTerminatedEvent`
 *   - `TokenRefreshedEvent`
 *
 * STRICT mode (Q51 default): if the audit storage is unreachable, the
 * handler propagates the failure to the event bus loop. This is the
 * compliance choice for LGPD/GDPR: an auth event without an audit row
 * is a regulatory gap.
 *
 * Composition (Q52 lenient: { lenient: true }) is intentionally NOT
 * used here. Use only for telemetry-style events (export, social
 * follow) where a missed row is observability loss but not a
 * compliance failure.
 *
 * No inheritance — each handler is a concrete class with a thin
 * `handle` method that calls `buildAuditEntry()`.
 */

import { type AuditLogPort, buildAuditEntry } from '@/shared-kernel/audit';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';
import type {
  LoginFailedEvent,
  SessionCreatedEvent,
  SessionTerminatedEvent,
  TokenRefreshedEvent,
  UserLoggedInEvent,
  UserLoggedOutEvent,
} from '../../domain/events';

const CTX = 'AuthAuditHandler';

export class AuthAuditHandler {
  constructor(
    private readonly audit: AuditLogPort,
    private readonly logger: LoggerPort,
  ) {}

  async onLoginFailed(event: LoginFailedEvent): Promise<void> {
    await this.audit.log(
      buildAuditEntry({
        userId: event.aggregateId, // email — pre-auth, no userId yet
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
      }),
    );
    this.logger.debug(`Audit: LOGIN_FAILED ${event.aggregateId}`, CTX);
  }

  async onUserLoggedIn(event: UserLoggedInEvent): Promise<void> {
    await this.audit.log(
      buildAuditEntry({
        userId: event.aggregateId,
        action: 'USER_LOGGED_IN',
        entityType: 'User',
        entityId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
      }),
    );
  }

  async onUserLoggedOut(event: UserLoggedOutEvent): Promise<void> {
    await this.audit.log(
      buildAuditEntry({
        userId: event.aggregateId,
        action: 'USER_LOGGED_OUT',
        entityType: 'User',
        entityId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
      }),
    );
  }

  async onSessionCreated(event: SessionCreatedEvent): Promise<void> {
    await this.audit.log(
      buildAuditEntry({
        userId: event.aggregateId,
        action: 'SESSION_CREATED',
        entityType: 'Session',
        entityId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
      }),
    );
  }

  async onSessionTerminated(event: SessionTerminatedEvent): Promise<void> {
    await this.audit.log(
      buildAuditEntry({
        userId: event.aggregateId,
        action: 'SESSION_TERMINATED',
        entityType: 'Session',
        entityId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
      }),
    );
  }

  async onTokenRefreshed(event: TokenRefreshedEvent): Promise<void> {
    await this.audit.log(
      buildAuditEntry({
        userId: event.aggregateId,
        action: 'TOKEN_REFRESHED',
        entityType: 'Session',
        entityId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
      }),
    );
  }
}
