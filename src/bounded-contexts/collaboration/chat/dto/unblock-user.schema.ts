import { z } from 'zod';

export const UnblockUserSchema = z.object({ userId: z.string().min(1, 'User ID is required') });

export type UnblockUserDto = z.infer<typeof UnblockUserSchema>;
