import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { EXAMPLE_PASSWORD } from '../params/example-values.const';

extendZodWithOpenApi(z);

/**
 * Password Policy Configuration
 *
 * Single source of truth for password requirements.
 * Both frontend and backend reference these constants.
 */
export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  specialChars: '@$!%*?&',
} as const;

/**
 * Password Validation Messages
 *
 * Derived from PASSWORD_POLICY to prevent drift.
 */
export const PASSWORD_MESSAGES = {
  minLength: `Password must be at least ${PASSWORD_POLICY.minLength} characters`,
  maxLength: `Password must not exceed ${PASSWORD_POLICY.maxLength} characters`,
  requireUppercase: 'Password must contain at least one uppercase letter',
  requireLowercase: 'Password must contain at least one lowercase letter',
  requireNumber: 'Password must contain at least one number',
  requireSpecialChar: `Password must contain at least one special character (${PASSWORD_POLICY.specialChars})`,
} as const;

/**
 * Password Schema
 *
 * Strict validation for new passwords (registration, password change).
 */
export const PasswordSchema = z
  .string()
  .min(PASSWORD_POLICY.minLength, PASSWORD_MESSAGES.minLength)
  .max(PASSWORD_POLICY.maxLength, PASSWORD_MESSAGES.maxLength)
  .regex(/[A-Z]/, PASSWORD_MESSAGES.requireUppercase)
  .regex(/[a-z]/, PASSWORD_MESSAGES.requireLowercase)
  .regex(/[0-9]/, PASSWORD_MESSAGES.requireNumber)
  .regex(/[@$!%*?&]/, PASSWORD_MESSAGES.requireSpecialChar)
  .openapi({ example: EXAMPLE_PASSWORD });

export type Password = z.infer<typeof PasswordSchema>;

/**
 * Password Input Schema
 *
 * Lenient validation for login (allows legacy passwords).
 */
export const PasswordInputSchema = z
  .string()
  .min(1, 'Password is required')
  .max(PASSWORD_POLICY.maxLength, PASSWORD_MESSAGES.maxLength)
  .openapi({ example: EXAMPLE_PASSWORD });

export type PasswordInput = z.infer<typeof PasswordInputSchema>;

export type PasswordDto = z.infer<typeof PasswordSchema>;

export type PasswordInputDto = z.infer<typeof PasswordInputSchema>;
