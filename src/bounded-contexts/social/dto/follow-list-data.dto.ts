import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PaginatedResultSchema } from './paginated-result.dto';

const FollowListDataSchema = z.object({
  followers: PaginatedResultSchema,
});

export class FollowListDataDto extends createZodDto(FollowListDataSchema) {}
