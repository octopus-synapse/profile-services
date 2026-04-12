import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ThemeApplyDataSchema = z.object({
  success: z.boolean(),
});

export class ThemeApplyDataDto extends createZodDto(ThemeApplyDataSchema) {}
