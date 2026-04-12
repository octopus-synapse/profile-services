import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ShareLinkDataSchema } from './share-link-data.dto';

const ShareListDataSchema = z.object({
  shares: z.array(ShareLinkDataSchema),
});

export class ShareListDataDto extends createZodDto(ShareListDataSchema) {}
