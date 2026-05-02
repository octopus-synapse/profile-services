import { z } from 'zod';

export const DeleteResponseSchema = z.object({ deleted: z.boolean(), id: z.string() });

export type DeleteResponseDto = z.infer<typeof DeleteResponseSchema>;
