import { z } from 'zod';
import { EmailSchema } from '../primitives';

/**
 * Email Verification Schema
 */
export const EmailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export type EmailVerification = z.infer<typeof EmailVerificationSchema>;

/**
 * Request Verification Schema
 * Email is optional - if not provided, uses authenticated user's email
 */
export const RequestVerificationSchema = z.object({
  email: EmailSchema.optional(),
});

export type RequestVerification = z.infer<typeof RequestVerificationSchema>;

// Type alias for backward compatibility
export type VerifyEmail = EmailVerification;
