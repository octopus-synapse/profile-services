import { z } from 'zod';
import { ShareLinkDataSchema } from './share-link-data.schema';

const ShareCreateDataSchema = z.object({ share: ShareLinkDataSchema });

export type ShareCreateDataDto = z.infer<typeof ShareCreateDataSchema>;
