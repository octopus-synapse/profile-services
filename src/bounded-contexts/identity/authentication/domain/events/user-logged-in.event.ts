/**
 * Authentication Domain Events
 */
import { DomainEvent } from '../../../shared-kernel/domain/events';

/**
 * User Logged In Event
 *
 * Fired when a user successfully logs in.
 */
export class UserLoggedInEvent extends DomainEvent {
  readonly eventType = 'auth.user.logged_in';
  readonly aggregateId: string;

  get payload(): Record<string, unknown> {
    return this.getPayload();
  }

  constructor(
    public readonly userId: string,
    public readonly loginMethod: 'password' | 'oauth' | 'token' | '2fa_totp' | '2fa_backup_code',
    public readonly ipAddress?: string,
    public readonly userAgent?: string,
  ) {
    super();
    this.aggregateId = userId;
  }

  protected getPayload(): Record<string, unknown> {
    return {
      userId: this.userId,
      loginMethod: this.loginMethod,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
    };
  }
}
