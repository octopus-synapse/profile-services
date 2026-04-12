import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const DeleteResponseSchema = z.object({
  deleted: z.boolean(),
  id: z.string(),
});

export class DeleteResponseDto extends createZodDto(DeleteResponseSchema) {}
