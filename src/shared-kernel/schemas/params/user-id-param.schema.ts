import { z } from 'zod';

/** Route param: `/:userId` */
export const UserIdParamSchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID"),
});

export type UserIdParam = z.infer<typeof UserIdParamSchema>;
