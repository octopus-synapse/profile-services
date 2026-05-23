import { z } from 'zod';
import { TwoFactorCodeSchema } from '@/shared-kernel/schemas/two-factor/two-factor.schema';

// Request Schema
const VerifyAndEnable2faRequestSchema = z.object({ code: TwoFactorCodeSchema });

// Response Schema
const VerifyAndEnable2faResponseSchema = z.object({
  enabled: z.boolean(),
  backupCodes: z.array(z.string()),
});

// DTO Classes

export type VerifyAndEnable2faRequestDto = z.infer<typeof VerifyAndEnable2faRequestSchema>;

export type VerifyAndEnable2faResponseDto = z.infer<typeof VerifyAndEnable2faResponseSchema>;
