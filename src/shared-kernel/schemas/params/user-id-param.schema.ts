import { z } from 'zod';

/** Route param: `/:userId` */
export const UserIdParamSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
});

export type UserIdParam = z.infer<typeof UserIdParamSchema>;
