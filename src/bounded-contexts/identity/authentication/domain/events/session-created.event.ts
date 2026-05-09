/**
 * Authentication Domain Events
 */
import { DomainEvent } from '../../../shared-kernel/domain/events';

/**
 * Session Created Event
 *
 * Fired when a new session is created (cookie-based auth).
 */
export class SessionCreatedEvent extends DomainEvent {
  readonly eventType = 'auth.session.created';
  readonly aggregateId: string;

  get payload(): Record<string, unknown> {
    return this.getPayload();
  }

  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly ipAddress?: string,
    public readonly userAgent?: string,
  ) {
    super();
    this.aggregateId = sessionId;
  }

  protected getPayload(): Record<string, unknown> {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
    };
  }
}
