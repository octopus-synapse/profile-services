import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CompleteOnboardingResponseSchema = z.object({
  resumeId: z.string(),
});

export class CompleteOnboardingResponseDto extends createZodDto(CompleteOnboardingResponseSchema) {}
