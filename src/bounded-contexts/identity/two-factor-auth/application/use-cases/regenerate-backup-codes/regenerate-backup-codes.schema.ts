import { z } from 'zod';

const RegenerateBackupCodesResponseSchema = z.object({ backupCodes: z.array(z.string()) });

export type RegenerateBackupCodesResponseDto = z.infer<typeof RegenerateBackupCodesResponseSchema>;
