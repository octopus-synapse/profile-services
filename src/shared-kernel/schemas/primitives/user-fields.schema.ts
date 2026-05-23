import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { EXAMPLE_LOCATION, EXAMPLE_NAME, EXAMPLE_PHONE } from '../params/example-values.const';

extendZodWithOpenApi(z);

export const FullNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name cannot exceed 100 characters')
  .openapi('FullName', {
    example: EXAMPLE_NAME,
    description: 'Full name (2-100 characters). Trimmed on submit.',
  });

export type FullName = z.infer<typeof FullNameSchema>;

export const PhoneSchema = z
  .string()
  .max(20, 'Phone number cannot exceed 20 characters')
  .optional()
  .openapi('Phone', {
    example: EXAMPLE_PHONE,
    description:
      'Phone number, free-form up to 20 characters. Recommended format: E.164 (e.g. `+5511999990000`).',
  });

export type Phone = z.infer<typeof PhoneSchema>;

export const UserLocationSchema = z
  .string()
  .max(100, 'Location cannot exceed 100 characters')
  .optional()
  .openapi('UserLocation', {
    example: EXAMPLE_LOCATION,
    description: 'Free-form city/region/country label (max 100 characters).',
  });

export type UserLocation = z.infer<typeof UserLocationSchema>;

export type FullNameDto = z.infer<typeof FullNameSchema>;
export type PhoneDto = z.infer<typeof PhoneSchema>;
export type UserLocationDto = z.infer<typeof UserLocationSchema>;
