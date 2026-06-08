/**
 * Session Entity (Aggregate Root)
 *
 * Represents an authenticated user session.
 * Sessions are stored as JWT tokens in httpOnly cookies.
 *
 * Business Rules:
 * - Session must have valid expiration (after creation)
 * - Session can be checked for expiration
 * - Session can generate its JWT payload
 */

import { InvalidSessionException } from '../exceptions';

export interface SessionPayload {
  sub: string;
  email: string;
  sessionId: string;
  iat: number;
  exp: number;
  /**
   * "Keep me signed in" — when true the cookie is persistent (Max-Age set)
   * and slides on refresh; when false/absent it's a session cookie (dies on
   * browser close). Embedded in the JWT so `/refresh` can re-issue with the
   * same lifetime without the client re-stating the choice. Optional for
   * back-compat with tokens minted before this field existed.
   */
  persistent?: boolean;
}

export interface SessionProps {
  id: string;
  userId: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  persistent?: boolean;
}

export class Session {
  public readonly id: string;
  public readonly userId: string;
  public readonly email: string;
  public readonly createdAt: Date;
  public readonly expiresAt: Date;
  public readonly ipAddress?: string;
  public readonly userAgent?: string;
  public readonly persistent: boolean;

  private constructor(props: SessionProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.email = props.email;
    this.createdAt = props.createdAt;
    this.expiresAt = props.expiresAt;
    this.ipAddress = props.ipAddress;
    this.userAgent = props.userAgent;
    this.persistent = props.persistent ?? false;

    this.validate();
  }

  /**
   * Factory method to create a new session
   */
  static create(props: SessionProps): Session {
    return new Session(props);
  }

  /**
   * Factory method to create session with auto-generated values
   */
  static createNew(
    userId: string,
    email: string,
    expiryDays: number,
    ipAddress?: string,
    userAgent?: string,
    persistent = false,
  ): Session {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    return new Session({
      id: crypto.randomUUID(),
      userId,
      email,
      createdAt: now,
      expiresAt,
      ipAddress,
      userAgent,
      persistent,
    });
  }

  /**
   * Validates session invariants
   */
  private validate(): void {
    if (!this.id) {
      throw new InvalidSessionException('Session ID is required');
    }
    if (!this.userId) {
      throw new InvalidSessionException('User ID is required');
    }
    if (!this.email) {
      throw new InvalidSessionException('Email is required');
    }
    if (this.expiresAt <= this.createdAt) {
      throw new InvalidSessionException('Expiration must be after creation');
    }
  }

  /**
   * Check if session has expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Get remaining time until expiration in milliseconds
   */
  getRemainingTime(): number {
    const remaining = this.expiresAt.getTime() - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Convert to JWT payload
   */
  toPayload(): SessionPayload {
    return {
      sub: this.userId,
      email: this.email,
      sessionId: this.id,
      iat: Math.floor(this.createdAt.getTime() / 1000),
      exp: Math.floor(this.expiresAt.getTime() / 1000),
      persistent: this.persistent,
    };
  }
}
