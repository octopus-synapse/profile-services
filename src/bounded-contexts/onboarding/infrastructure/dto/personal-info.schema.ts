import { z } from 'zod';
import { EmailSchema, PhoneSchema, UserLocationSchema } from '@/shared-kernel/schemas/primitives';

export const PersonalInfoSchema = z.object({
  fullName: z.string(),
  email: EmailSchema.optional(),
  phone: PhoneSchema,
  location: UserLocationSchema,
});

export type PersonalInfoDto = z.infer<typeof PersonalInfoSchema>;
