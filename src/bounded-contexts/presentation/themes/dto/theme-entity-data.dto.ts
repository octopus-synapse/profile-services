import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ThemeEntityDataSchema = z.object({
  theme: z.record(z.unknown()),
});

const ThemeNullableEntityDataSchema = z.object({
  theme: z.record(z.unknown()).nullable(),
});

export class ThemeEntityDataDto extends createZodDto(ThemeEntityDataSchema) {}
export class ThemeNullableEntityDataDto extends createZodDto(ThemeNullableEntityDataSchema) {}
