/**
 * Username Validation Schema
 *
 * Domain rules for unique user identifiers.
 * Enforces format, length, and reserved name constraints.
 */

import { z } from 'zod';

/**
 * Reserved Usernames
 *
 * System routes and protected identifiers.
 * Cannot be claimed by users.
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
