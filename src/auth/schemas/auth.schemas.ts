/**
 * Auth Validation Schemas
 * Centralized Zod schemas for authentication endpoints
 */

import { z } from 'zod';

// Login
export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters' })
    .max(100, { message: 'Password must not exceed 100 characters' }),
});

export type LoginDto = z.infer<typeof loginSchema>;

// Signup
export const signupSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email(),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters' })
    .max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: 'Password must contain uppercase, lowercase, and number',
    }),
});

export type SignupDto = z.infer<typeof signupSchema>;

// Refresh Token
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

// Change Email
export const changeEmailSchema = z.object({
  newEmail: z.string().email(),
  password: z.string().min(6),
});

export type ChangeEmailDto = z.infer<typeof changeEmailSchema>;

// Email Verification
export const emailVerificationSchema = z.object({
  token: z.string().min(1),
});

export type EmailVerificationDto = z.infer<typeof emailVerificationSchema>;

// Delete Account
export const deleteAccountSchema = z.object({
  password: z.string().min(1),
  confirmation: z.literal('DELETE MY ACCOUNT'),
});

export type DeleteAccountDto = z.infer<typeof deleteAccountSchema>;
