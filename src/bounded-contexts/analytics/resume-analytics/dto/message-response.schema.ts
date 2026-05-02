import { z } from 'zod';

export const MessageResponseSchema = z.object({ message: z.string() });

export type MessageResponseDto = z.infer<typeof MessageResponseSchema>;
