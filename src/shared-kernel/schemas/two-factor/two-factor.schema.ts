/**
 * Two-Factor Authentication DTOs
 *
 * Domain types and validation schemas for 2FA setup and verification.
 */

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

extendZodWithOpenApi(z);

/**
 * 6-digit numeric TOTP code. Single source of truth for both 2FA enrolment
 * (`verify-and-enable`) and recurring login verification.
 */
export const TwoFactorCodeSchema = z
  .string()
  .length(6, 'Code must be 6 digits')
  .regex(/^\d{6}$/, 'Code must be 6 digits')
  .openapi({
    example: '123456',
    description: '6-digit numeric TOTP code from the authenticator app.',
  });

export type TwoFactorCode = z.infer<typeof TwoFactorCodeSchema>;

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
  token: TwoFactorCodeSchema,
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
