import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UnblockUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export class UnblockUserDto extends createZodDto(UnblockUserSchema) {}
