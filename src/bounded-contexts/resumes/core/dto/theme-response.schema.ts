import { z } from 'zod';

export const ThemeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  styleScore: z.number().int().min(0).max(100),
});

export type ThemeDto = z.infer<typeof ThemeSchema>;
