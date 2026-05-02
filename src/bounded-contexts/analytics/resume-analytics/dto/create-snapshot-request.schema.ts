import { z } from 'zod';

export const CreateSnapshotRequestSchema = z.object({
  label: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateSnapshotRequestDto = z.infer<typeof CreateSnapshotRequestSchema>;
