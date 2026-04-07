import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ValidateCVOptionsSchema = z.object({
  checkFormat: z.coerce.boolean().default(true).optional(),
  checkSections: z.coerce.boolean().default(true).optional(),
  checkGrammar: z.coerce.boolean().default(false).optional(),
  checkOrder: z.coerce.boolean().default(true).optional(),
  checkLayout: z.coerce.boolean().default(true).optional(),
  resumeId: z.string().optional(),
  checkSemantic: z.coerce.boolean().default(true).optional(),
});

export class ValidateCVOptionsDto extends createZodDto(ValidateCVOptionsSchema) {}
