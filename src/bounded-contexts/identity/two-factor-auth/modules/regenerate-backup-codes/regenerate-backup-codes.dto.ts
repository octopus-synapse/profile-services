/**
 * Regenerate Backup Codes DTOs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const RegenerateBackupCodesResponseSchema = z.object({
  backupCodes: z.array(z.string()),
});

export class RegenerateBackupCodesResponseDto extends createZodDto(
  RegenerateBackupCodesResponseSchema,
) {}
