import { z } from 'zod';

const UnfollowDataSchema = z.object({ unfollowed: z.boolean() });

export type UnfollowDataDto = z.infer<typeof UnfollowDataSchema>;
