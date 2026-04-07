import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateSnapshotRequestSchema = z.object({
  label: z.string().optional(),
  notes: z.string().optional(),
});

export class CreateSnapshotRequestDto extends createZodDto(CreateSnapshotRequestSchema) {}
