/**
 * Authentication Domain Events
 */
import { DomainEvent } from '../../../shared-kernel/domain/events';

/**
 * Token Refreshed Event
 *
 * Fired when access token is refreshed using refresh token.
 */
export class TokenRefreshedEvent extends DomainEvent {
  readonly eventType = 'auth.token.refreshed';
  readonly aggregateId: string;

  get payload(): Record<string, unknown> {
    return this.getPayload();
  }

  constructor(public readonly userId: string) {
    super();
    this.aggregateId = userId;
  }

  protected getPayload(): Record<string, unknown> {
    return { userId: this.userId };
  }
}
