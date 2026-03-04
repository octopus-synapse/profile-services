import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Request Schema
const VerifyAndEnable2faRequestSchema = z.object({
  token: z.string().length(6),
});

// Response Schema
const VerifyAndEnable2faResponseSchema = z.object({
  backupCodes: z.array(z.string()),
});

// DTO Classes
export class VerifyAndEnable2faRequestDto extends createZodDto(VerifyAndEnable2faRequestSchema) {}
export class VerifyAndEnable2faResponseDto extends createZodDto(VerifyAndEnable2faResponseSchema) {}
