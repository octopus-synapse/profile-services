/**
 * Authentication Domain Events
 */
import { DomainEvent } from '../../../shared-kernel/domain/events';

/**
 * Session Terminated Event
 *
 * Fired when a session is terminated (logout or expiration).
 */
export class SessionTerminatedEvent extends DomainEvent {
  readonly eventType = 'auth.session.terminated';
  readonly aggregateId: string;

  get payload(): Record<string, unknown> {
    return this.getPayload();
  }

  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly reason: 'logout' | 'expired' | 'revoked',
  ) {
    super();
    this.aggregateId = sessionId;
  }

  protected getPayload(): Record<string, unknown> {
    return { sessionId: this.sessionId, userId: this.userId, reason: this.reason };
  }
}
