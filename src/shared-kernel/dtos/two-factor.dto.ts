/**
 * Two-Factor Authentication DTOs
 *
 * Domain types and validation schemas for 2FA setup and verification.
 */

import { z } from "zod";

// ============================================================================
// Setup 2FA
// ============================================================================

export const SetupTwoFactorResponseSchema = z.object({
  secret: z.string().min(1),
  qrCodeUrl: z.string().url(),
  backupCodes: z.array(z.string().length(10)),
});

export type SetupTwoFactorResponse = z.infer<typeof SetupTwoFactorResponseSchema>;

// ============================================================================
// Verify 2FA Token
// ============================================================================

export const VerifyTwoFactorTokenSchema = z.object({
  token: z.string().length(6).regex(/^\d{6}$/, "Token must be 6 digits"),
});

export type VerifyTwoFactorToken = z.infer<typeof VerifyTwoFactorTokenSchema>;

// Alias for backward compatibility
export type VerifySetupDto = VerifyTwoFactorToken;
export type VerifyLoginDto = VerifyTwoFactorToken;

// ============================================================================
// 2FA Status
// ============================================================================

export const TwoFactorStatusSchema = z.object({
  enabled: z.boolean(),
  verifiedAt: z.string().datetime().nullable(),
});

export type TwoFactorStatus = z.infer<typeof TwoFactorStatusSchema>;
