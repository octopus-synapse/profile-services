import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { EXAMPLE_EMAIL } from '../params/example-values.const';

extendZodWithOpenApi(z);

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email format')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must not exceed 255 characters')
  .openapi({ example: EXAMPLE_EMAIL });

export type Email = z.infer<typeof EmailSchema>;
export type EmailDto = z.infer<typeof EmailSchema>;
