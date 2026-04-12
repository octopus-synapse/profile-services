/**
 * Username Schema (Onboarding contract)
 *
 * Local copy of username validation for onboarding.
 */

import { z } from 'zod';

const RESERVED_USERNAMES = [
  'admin',
  'api',
  'app',
  'auth',
  'blog',
  'cdn',
  'dashboard',
  'dev',
  'docs',
  'help',
  'legal',
  'login',
  'logout',
  'mail',
  'oauth',
  'onboarding',
  'pricing',
  'privacy',
  'profile',
  'register',
  'root',
  'settings',
  'signup',
  'static',
  'status',
  'support',
  'terms',
  'test',
  'www',
  'about',
  'contact',
  'home',
  'index',
  'null',
  'undefined',
  'user',
  'users',
] as const;

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
