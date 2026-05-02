import { z } from 'zod';

const ShareDeleteDataSchema = z.object({ deleted: z.boolean() });

export type ShareDeleteDataDto = z.infer<typeof ShareDeleteDataSchema>;
