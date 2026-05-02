import { z } from 'zod';
import { PaginatedResultSchema } from './paginated-result.schema';

const ActivityFeedDataSchema = z.object({ feed: PaginatedResultSchema });

export type ActivityFeedDataDto = z.infer<typeof ActivityFeedDataSchema>;
