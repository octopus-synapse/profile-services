/**
 * Get 2FA Status DTOs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const Get2faStatusResponseSchema = z.object({
  enabled: z.boolean(),
  lastUsedAt: z.string().datetime().nullable(),
  backupCodesRemaining: z.number().int(),
});

export class Get2faStatusResponseDto extends createZodDto(Get2faStatusResponseSchema) {}
