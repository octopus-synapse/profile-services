/**
 * Username Response DTOs
 *
 * DTOs for username validation and update operations.
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Schemas
// ============================================================================

const UsernameValidationErrorCodeSchema = z.enum([
  'TOO_SHORT',
  'TOO_LONG',
  'INVALID_FORMAT',
  'INVALID_START',
  'INVALID_END',
  'CONSECUTIVE_UNDERSCORES',
  'RESERVED',
  'UPPERCASE',
  'ALREADY_TAKEN',
]);

const UsernameValidationErrorSchema = z.object({
  code: UsernameValidationErrorCodeSchema,
  message: z.string(),
});

const ValidateUsernameResponseSchema = z.object({
  username: z.string(),
  valid: z.boolean(),
  available: z.boolean().optional(),
  errors: z.array(UsernameValidationErrorSchema),
});

const CheckUsernameResponseSchema = z.object({
  available: z.boolean(),
  message: z.string().optional(),
});

const UpdateUsernameResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  username: z.string(),
});

// ============================================================================
// DTOs
// ============================================================================

export class UsernameValidationErrorDto extends createZodDto(UsernameValidationErrorSchema) {}
export class ValidateUsernameResponseDto extends createZodDto(ValidateUsernameResponseSchema) {}
export class CheckUsernameResponseDto extends createZodDto(CheckUsernameResponseSchema) {}
export class UpdateUsernameResponseDto extends createZodDto(UpdateUsernameResponseSchema) {}

// Re-export enum for backwards compatibility
export const UsernameValidationErrorCode = UsernameValidationErrorCodeSchema.enum;
export type UsernameValidationErrorCode = z.infer<typeof UsernameValidationErrorCodeSchema>;
