/**
 * Password Validation Schema
 *
 * Backend-only concern for authentication.
 * Not part of domain contracts as password rules are infrastructure-specific.
 */

import { z } from 'zod';

/**
 * Password Schema
 *
 * Security requirements:
 * - Minimum 8 characters for reasonable security
 * - Maximum 128 characters to prevent DoS
 * - Must contain: uppercase, lowercase, number
 */
export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export type Password = z.infer<typeof PasswordSchema>;
