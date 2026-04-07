import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UnfollowDataSchema = z.object({
  unfollowed: z.boolean(),
});

export class UnfollowDataDto extends createZodDto(UnfollowDataSchema) {}
