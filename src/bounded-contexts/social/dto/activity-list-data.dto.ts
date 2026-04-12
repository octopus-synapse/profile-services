import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PaginatedResultSchema } from './paginated-result.dto';

const ActivityListDataSchema = z.object({
  activities: PaginatedResultSchema,
});

export class ActivityListDataDto extends createZodDto(ActivityListDataSchema) {}
