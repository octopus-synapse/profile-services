/**
 * Session Device Port (Inbound)
 *
 * Read/revoke abstraction over a user's active refresh-token sessions.
 * The infrastructure adapter (`SessionDeviceService`) implements this
 * port; the bundle exposes it through a framework-free interface so
 * the route handlers don't need to import the Nest-side service
 * directly.
 */

export interface SessionDeviceView {
  id: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceName: string | null;
  authMethod: string | null;
  revoked: boolean;
}

export abstract class SessionDevicePort {
  abstract listActiveForUser(userId: string): Promise<SessionDeviceView[]>;
  abstract revokeForUser(userId: string, id: string): Promise<void>;
}
