/**
 * Domain Exception Base Class
 *
 * All domain exceptions MUST extend this class.
 * Framework-agnostic - can be mapped to HTTP/GraphQL errors in adapters.
 *
 * @example
 * ```typescript
 * export class UserNotFoundException extends DomainException {
 *   readonly code = 'USER_NOT_FOUND';
 *   constructor(userId: string) {
 *     super(`User with id ${userId} not found`);
 *   }
 * }
 * ```
 */
export abstract class DomainException extends Error {
  /**
   * Machine-readable error code for API responses
   */
  abstract readonly code: string;

  /**
   * HTTP status code hint (adapters can override)
   */
  readonly statusHint: number = 500;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Converts exception to a plain object for serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      name: this.name,
    };
  }
}
