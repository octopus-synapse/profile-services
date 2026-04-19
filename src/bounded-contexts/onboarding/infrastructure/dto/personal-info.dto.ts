import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const PersonalInfoSchema = z.object({
  fullName: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
});

export class PersonalInfoDto extends createZodDto(PersonalInfoSchema) {}
