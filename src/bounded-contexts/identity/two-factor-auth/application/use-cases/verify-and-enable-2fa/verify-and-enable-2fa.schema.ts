import { z } from 'zod';

// Request Schema
const VerifyAndEnable2faRequestSchema = z.object({ code: z.string().length(6) });

// Response Schema
const VerifyAndEnable2faResponseSchema = z.object({
  enabled: z.boolean(),
  backupCodes: z.array(z.string()),
});

// DTO Classes

export type VerifyAndEnable2faRequestDto = z.infer<typeof VerifyAndEnable2faRequestSchema>;

export type VerifyAndEnable2faResponseDto = z.infer<typeof VerifyAndEnable2faResponseSchema>;
