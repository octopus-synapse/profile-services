import { z } from 'zod';

const MarkAsReadDataSchema = z.object({ count: z.number().int() });

export type MarkAsReadDataDto = z.infer<typeof MarkAsReadDataSchema>;
