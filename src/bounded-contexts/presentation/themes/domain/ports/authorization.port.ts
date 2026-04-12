/**
 * Authorization Port (Themes context)
 *
 * Abstraction for permission checks needed by theme use cases.
 */

export abstract class AuthorizationPort {
  abstract hasPermission(userId: string, resource: string, action: string): Promise<boolean>;
}
