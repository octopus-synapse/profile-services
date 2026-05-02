import { z } from 'zod';
import { PaginatedResultSchema } from './paginated-result.schema';

const FollowListDataSchema = z.object({ followers: PaginatedResultSchema });

export type FollowListDataDto = z.infer<typeof FollowListDataSchema>;
