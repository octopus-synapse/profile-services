/**
 * Two-Factor Authentication DTOs
 *
 * Domain types and validation schemas for 2FA setup and verification.
 */

import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

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
  token: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'Token must be 6 digits'),
});

export type VerifyTwoFactorToken = z.infer<typeof VerifyTwoFactorTokenSchema>;

// ============================================================================
// 2FA Status
// ============================================================================

export const TwoFactorStatusSchema = z.object({
  enabled: z.boolean(),
  verifiedAt: IsoDateTimeSchema.nullable(),
});

export type TwoFactorStatus = z.infer<typeof TwoFactorStatusSchema>;

export type SetupTwoFactorResponseDto = z.infer<typeof SetupTwoFactorResponseSchema>;

export type VerifyTwoFactorTokenDto = z.infer<typeof VerifyTwoFactorTokenSchema>;

export type TwoFactorStatusDto = z.infer<typeof TwoFactorStatusSchema>;
