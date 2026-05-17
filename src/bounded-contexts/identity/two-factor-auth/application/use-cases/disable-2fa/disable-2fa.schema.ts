import { z } from 'zod';
import { TwoFactorCodeSchema } from '@/shared-kernel/schemas/two-factor/two-factor.schema';

/**
 * Disable-2FA request body — at least one of `currentPassword` / `totpCode`
 * MUST be present. The route handler forwards both to the use-case; the
 * use-case enforces the "at least one" rule and verifies whichever side(s)
 * the client supplied.
 */
export const Disable2faSchema = z
  .object({
    currentPassword: z.string().min(1).max(200).optional(),
    totpCode: TwoFactorCodeSchema.optional(),
  })
  .refine((d) => Boolean(d.currentPassword) || Boolean(d.totpCode), {
    message: 'Provide either currentPassword or totpCode',
    path: ['currentPassword'],
  });

export type Disable2faRequestDto = z.infer<typeof Disable2faSchema>;
