import { z } from 'zod';

const Setup2faResponseSchema = z.object({
  secret: z.string(),
  qrCode: z.string(),
  manualEntryKey: z.string(),
});

export type Setup2faResponseDto = z.infer<typeof Setup2faResponseSchema>;
