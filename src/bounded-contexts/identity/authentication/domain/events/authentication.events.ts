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

  constructor(
    public readonly userId: string,
    public readonly loginMethod: 'password' | 'oauth' | 'token',
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

/**
 * User Logged Out Event
 *
 * Fired when a user logs out.
 */
export class UserLoggedOutEvent extends DomainEvent {
  readonly eventType = 'auth.user.logged_out';
  readonly aggregateId: string;

  constructor(
    public readonly userId: string,
    public readonly logoutType: 'manual' | 'token_expired' | 'all_sessions',
  ) {
    super();
    this.aggregateId = userId;
  }

  protected getPayload(): Record<string, unknown> {
    return {
      userId: this.userId,
      logoutType: this.logoutType,
    };
  }
}

/**
 * Login Failed Event
 *
 * Fired when a login attempt fails.
 */
export class LoginFailedEvent extends DomainEvent {
  readonly eventType = 'auth.login.failed';
  readonly aggregateId: string;

  constructor(
    public readonly email: string,
    public readonly reason: 'invalid_credentials' | 'account_locked' | 'account_inactive',
    public readonly ipAddress?: string,
  ) {
    super();
    this.aggregateId = email;
  }

  protected getPayload(): Record<string, unknown> {
    return {
      email: this.email,
      reason: this.reason,
      ipAddress: this.ipAddress,
    };
  }
}

/**
 * Token Refreshed Event
 *
 * Fired when access token is refreshed using refresh token.
 */
export class TokenRefreshedEvent extends DomainEvent {
  readonly eventType = 'auth.token.refreshed';
  readonly aggregateId: string;

  constructor(public readonly userId: string) {
    super();
    this.aggregateId = userId;
  }

  protected getPayload(): Record<string, unknown> {
    return {
      userId: this.userId,
    };
  }
}
