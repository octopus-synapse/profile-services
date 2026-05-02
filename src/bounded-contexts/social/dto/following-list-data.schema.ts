import { z } from 'zod';
import { PaginatedResultSchema } from './paginated-result.schema';

const FollowingListDataSchema = z.object({ following: PaginatedResultSchema });

export type FollowingListDataDto = z.infer<typeof FollowingListDataSchema>;
