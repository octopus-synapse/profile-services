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

export type ResendCooldownDto = z.infer<typeof ResendCooldownSchema>;

export type SendVerificationEmailResponseDto = z.infer<typeof SendVerificationEmailResponseSchema>;

export type ResendCooldownResponseDto = z.infer<typeof ResendCooldownResponseSchema>;
