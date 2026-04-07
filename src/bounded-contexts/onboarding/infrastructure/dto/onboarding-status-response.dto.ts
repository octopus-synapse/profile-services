import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const OnboardingStatusResponseSchema = z.object({
  hasCompletedOnboarding: z.boolean(),
  onboardingCompletedAt: z.string().datetime().nullable().optional(),
});

export class OnboardingStatusResponseDto extends createZodDto(OnboardingStatusResponseSchema) {}
