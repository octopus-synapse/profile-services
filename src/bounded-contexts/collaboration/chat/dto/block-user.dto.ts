import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const BlockUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  reason: z.string().max(500, 'Reason too long').optional(),
});

export class BlockUserDto extends createZodDto(BlockUserSchema) {}
