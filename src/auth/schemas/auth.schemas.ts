/**
 * Auth Validation Schemas
 *
 * Re-exports from @octopus-synapse/profile-contracts.
 * Single source of truth for auth validation shared with frontend.
 */

import { z } from 'zod';
import {
  LoginCredentialsSchema,
  type LoginCredentials,
  RegisterCredentialsSchema,
  type RegisterCredentials,
  EmailSchema,
} from '@octopus-synapse/profile-contracts';

// Login (re-export from contracts)
export const loginSchema = LoginCredentialsSchema;
export type LoginDto = LoginCredentials;

// Signup (re-export from contracts)
export const signupSchema = RegisterCredentialsSchema;
export type SignupDto = RegisterCredentials;

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
