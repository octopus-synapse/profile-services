import { z } from 'zod';
import { ShareLinkDataSchema } from './share-link-data.schema';

const ShareListDataSchema = z.object({ shares: z.array(ShareLinkDataSchema) });

export type ShareListDataDto = z.infer<typeof ShareListDataSchema>;
