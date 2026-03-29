/**
 * Setup 2FA DTOs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const Setup2faResponseSchema = z.object({
  secret: z.string(),
  qrCode: z.string(),
  manualEntryKey: z.string(),
});

export class Setup2faResponseDto extends createZodDto(Setup2faResponseSchema) {}
