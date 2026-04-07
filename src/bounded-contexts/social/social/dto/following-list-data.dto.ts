import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PaginatedResultSchema } from './paginated-result.dto';

const FollowingListDataSchema = z.object({
  following: PaginatedResultSchema,
});

export class FollowingListDataDto extends createZodDto(FollowingListDataSchema) {}
