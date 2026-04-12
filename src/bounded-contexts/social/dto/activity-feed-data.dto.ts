import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PaginatedResultSchema } from './paginated-result.dto';

const ActivityFeedDataSchema = z.object({
  feed: PaginatedResultSchema,
});

export class ActivityFeedDataDto extends createZodDto(ActivityFeedDataSchema) {}
