import { createZodDto } from 'nestjs-zod';

import { CreateResumeRequestSchema } from './create-resume-request.dto';

export const UpdateResumeRequestSchema = CreateResumeRequestSchema.partial();

export class UpdateResumeRequestDto extends createZodDto(UpdateResumeRequestSchema) {}
