import { z } from 'zod';

export const PersonalInfoSchema = z.object({
  fullName: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
});

export type PersonalInfoDto = z.infer<typeof PersonalInfoSchema>;
