import { z } from 'zod';
import { PhoneSchema, UserLocationSchema } from '@/shared-kernel/schemas/primitives';

export const PersonalInfoSchema = z.object({
  fullName: z.string(),
  phone: PhoneSchema,
  location: UserLocationSchema,
});

export type PersonalInfoDto = z.infer<typeof PersonalInfoSchema>;
