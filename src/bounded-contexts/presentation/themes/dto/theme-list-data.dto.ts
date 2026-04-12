import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ThemeListDataSchema = z.object({
  themes: z.array(z.record(z.unknown())),
});

export class ThemeListDataDto extends createZodDto(ThemeListDataSchema) {}
