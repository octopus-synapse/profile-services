import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { EmailSchema, PasswordInputSchema } from '@/shared-kernel/schemas/primitives';

extendZodWithOpenApi(z);

// Request Schema
export const LoginSchema = z
  .object({ email: EmailSchema, password: PasswordInputSchema })
  .openapi('LoginRequest', {
    description:
      'Login payload. Password validation is lenient here (legacy accounts) — the strict policy applies on registration / change.',
    example: {
      email: 'dredd-fixture@profile.local',
      password: 'Dredd_Fixture_Password_123!',
    },
  });

// Request Schema for 2FA login verification
export const LoginVerify2faSchema = z
  .object({
    userId: z.string().min(1),
    code: z.string().min(6),
  })
  .openapi({
    example: {
      userId: '01900000-0000-7000-a000-000000000001',
      code: '123456',
    },
  });

// Response Schema
const LoginResponseSchema = z.object({
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresIn: z.number().optional(),
  userId: z.string(),
  twoFactorRequired: z.boolean().optional(),
});

// DTO Classes

export type LoginDto = z.infer<typeof LoginSchema>;

export type LoginVerify2faDto = z.infer<typeof LoginVerify2faSchema>;

export type LoginResponseDto = z.infer<typeof LoginResponseSchema>;
