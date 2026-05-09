/**
 * Username Validation Schema
 *
 * Domain rules for unique user identifiers.
 * Enforces format, length, and reserved name constraints.
 */

import { z } from 'zod';
import { RESERVED_USERNAMES } from '../value-objects/reserved-usernames.const';

// Re-exported for back-compat with code that imports the list via the
// schema barrel (e.g. shared-kernel/schemas/primitives/index.ts). The
// canonical home is `domain/value-objects/reserved-usernames.const.ts`.
export { RESERVED_USERNAMES };

/**
 * Username Format Schema
 *
 * Rules:
 * - Length: 3-30 characters
 * - Format: lowercase letters, numbers, underscores only
 * - No consecutive underscores
 * - Cannot start/end with underscore
 * - Not in reserved list
 */
export const UsernameSchema = z
  .string()
  .toLowerCase()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username cannot exceed 30 characters')
  .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores')
  .regex(/^[a-z0-9]/, 'Username must start with a letter or number')
  .regex(/[a-z0-9]$/, 'Username must end with a letter or number')
  .regex(/^(?!.*__)/, 'Username cannot contain consecutive underscores')
  .refine((username) => !(RESERVED_USERNAMES as readonly string[]).includes(username), {
    message: 'This username is reserved',
  });

/**
 * Username Availability Check
 *
 * Validates format first, then checks backend availability.
 * Frontend should call API separately for availability.
 */
export const validateUsernameFormat = (username: string) => {
  return UsernameSchema.safeParse(username);
};

export type UsernameDto = z.infer<typeof UsernameSchema>;
