import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ThemeResolvedConfigDataSchema = z.object({
  config: z.record(z.unknown()).nullable(),
});

export class ThemeResolvedConfigDataDto extends createZodDto(ThemeResolvedConfigDataSchema) {}
