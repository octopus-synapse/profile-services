import { z } from 'zod';

export const ThemeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

export type ThemeDto = z.infer<typeof ThemeSchema>;
