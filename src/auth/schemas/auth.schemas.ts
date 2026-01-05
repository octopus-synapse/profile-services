/**
 * Auth Validation Schemas
 *
 * Uses @octopus-synapse/profile-contracts for domain validation.
 * Password validation is backend-only (authentication infrastructure concern).
 */

import { z } from 'zod';
import { EmailSchema, FullNameSchema } from '@octopus-synapse/profile-contracts';
import { PasswordSchema } from './password.schema';

// Login
export const loginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginDto = z.infer<typeof loginSchema>;

// Signup
export const signupSchema = z.object({
  name: FullNameSchema.optional(),
  email: EmailSchema,
  password: PasswordSchema,
});

export type SignupDto = z.infer<typeof signupSchema>;

// Refresh Token
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

// Change Email
export const changeEmailSchema = z.object({
  newEmail: EmailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type ChangeEmailDto = z.infer<typeof changeEmailSchema>;

// Email Verification
export const emailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export type EmailVerificationDto = z.infer<typeof emailVerificationSchema>;

// Delete Account
export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  confirmation: z.literal('DELETE MY ACCOUNT'),
});

export type DeleteAccountDto = z.infer<typeof deleteAccountSchema>;
