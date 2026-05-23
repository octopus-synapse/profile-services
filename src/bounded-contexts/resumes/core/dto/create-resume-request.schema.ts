import { z } from 'zod';
import {
  BioSchema,
  GitHubUrlSchema,
  LinkedInUrlSchema,
  PhoneSchema,
  SocialUrlSchema,
  UserLocationSchema,
} from '@/shared-kernel/schemas/primitives';

export const CreateResumeRequestSchema = z.object({
  title: z.string().min(1).max(100),
  summary: BioSchema.optional(),
  isPublic: z.boolean().optional(),
  fullName: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  phone: PhoneSchema,
  location: UserLocationSchema,
  linkedin: LinkedInUrlSchema.optional(),
  github: GitHubUrlSchema.optional(),
  website: SocialUrlSchema.optional(),
  sections: z.array(z.record(z.unknown())).optional(),
});

export type CreateResumeRequestDto = z.infer<typeof CreateResumeRequestSchema>;
