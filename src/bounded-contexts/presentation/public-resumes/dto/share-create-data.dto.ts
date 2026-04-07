import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ShareLinkDataSchema } from './share-link-data.dto';

const ShareCreateDataSchema = z.object({
  share: ShareLinkDataSchema,
});

export class ShareCreateDataDto extends createZodDto(ShareCreateDataSchema) {}
