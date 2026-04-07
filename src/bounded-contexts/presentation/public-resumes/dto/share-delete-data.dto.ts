import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ShareDeleteDataSchema = z.object({
  deleted: z.boolean(),
});

export class ShareDeleteDataDto extends createZodDto(ShareDeleteDataSchema) {}
