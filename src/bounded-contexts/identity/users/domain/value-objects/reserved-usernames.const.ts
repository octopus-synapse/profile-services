/**
 * Reserved Usernames — Value Object (constants).
 *
 * System routes and protected identifiers users cannot claim. Lifted out
 * of `users/domain/schemas/username.schema.ts` so both the Zod refinement
 * and the validate-username use case can read from a single source
 * without circling back through the schema.
 *
 * Stays in `users/domain/value-objects/` rather than `shared-kernel/`:
 * other BCs do not register usernames, so this list is intrinsic to the
 * users submodule per ADR-002.
 */

export const RESERVED_USERNAMES = [
  // System routes
  'admin',
  'api',
  'app',
  'assets',
  'auth',
  'blog',
  'callback',
  'cdn',
  'dashboard',
  'dev',
  'docs',
  'health',
  'help',
  'legal',
  'login',
  'logout',
  'mail',
  'me',
  'oauth',
  'onboarding',
  'ping',
  'pricing',
  'privacy',
  'private',
  'profile',
  'public',
  'register',
  'root',
  'settings',
  'signin',
  'signup',
  'static',
  'status',
  'support',
  'system',
  'terms',
  'test',
  'webhook',
  'webhooks',
  'www',
  // Common protected names
  'about',
  'contact',
  'home',
  'index',
  'null',
  'undefined',
  'user',
  'users',
] as const;

/** O(1) membership check used by the validate use case. */
export const RESERVED_USERNAMES_SET: ReadonlySet<string> = new Set(RESERVED_USERNAMES);
