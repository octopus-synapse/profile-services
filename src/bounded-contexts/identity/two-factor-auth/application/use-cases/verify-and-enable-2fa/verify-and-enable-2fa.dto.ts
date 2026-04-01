import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Request Schema
const VerifyAndEnable2faRequestSchema = z.object({
  code: z.string().length(6),
});

// Response Schema
const VerifyAndEnable2faResponseSchema = z.object({
  enabled: z.boolean(),
  backupCodes: z.array(z.string()),
});

// DTO Classes
export class VerifyAndEnable2faRequestDto extends createZodDto(VerifyAndEnable2faRequestSchema) {}
export class VerifyAndEnable2faResponseDto extends createZodDto(VerifyAndEnable2faResponseSchema) {}
