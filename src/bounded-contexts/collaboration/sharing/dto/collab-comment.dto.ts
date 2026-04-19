import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateCollabCommentSchema = z.object({
  content: z.string().min(1).max(4000),
  parentId: z.string().optional(),
  sectionId: z.string().optional(),
  itemId: z.string().optional(),
});

export class CreateCollabCommentDto extends createZodDto(CreateCollabCommentSchema) {}
