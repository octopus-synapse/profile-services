import { z } from 'zod';
import { PaginatedResultSchema } from './paginated-result.schema';

const ActivityListDataSchema = z.object({ activities: PaginatedResultSchema });

export type ActivityListDataDto = z.infer<typeof ActivityListDataSchema>;
