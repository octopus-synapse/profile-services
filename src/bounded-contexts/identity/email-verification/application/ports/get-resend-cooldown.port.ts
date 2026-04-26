/**
 * Get Resend Cooldown Port (Inbound)
 *
 * Returns the current resend cooldown for the authenticated user so the UI
 * can render a countdown that survives page reloads. Source of truth for the
 * throttle window lives on the backend.
 */

import type { ResendCooldown } from './send-verification-email.port';

export interface GetResendCooldownQuery {
  userId: string;
}

export abstract class GetResendCooldownPort {
  abstract execute(query: GetResendCooldownQuery): Promise<ResendCooldown>;
}
