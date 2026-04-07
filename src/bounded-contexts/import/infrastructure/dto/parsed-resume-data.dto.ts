import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ParsedPersonalInfoSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
});

const ParsedSectionSchema = z.object({
  sectionTypeKey: z.string(),
  items: z.array(z.record(z.unknown())),
});

export const ParsedResumeDataSchema = z.object({
  personalInfo: ParsedPersonalInfoSchema,
  summary: z.string().optional(),
  sections: z.array(ParsedSectionSchema),
});

export class ParsedResumeDataDto extends createZodDto(ParsedResumeDataSchema) {}
