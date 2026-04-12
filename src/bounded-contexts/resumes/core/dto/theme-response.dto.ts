import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ThemeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

export class ResumeThemeResponseDto extends createZodDto(ThemeSchema) {}
