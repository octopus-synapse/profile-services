/**
 * Send Verification Email DTOs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ResendCooldownSchema = z.object({
  secondsUntilResendAllowed: z.number().int().min(0),
  cooldownSeconds: z.number().int().positive(),
});

const SendVerificationEmailResponseSchema = z.object({
  message: z.string(),
  cooldown: ResendCooldownSchema,
});

const ResendCooldownResponseSchema = ResendCooldownSchema;

export class SendVerificationEmailResponseDto extends createZodDto(
  SendVerificationEmailResponseSchema,
) {}

export class ResendCooldownResponseDto extends createZodDto(ResendCooldownResponseSchema) {}
