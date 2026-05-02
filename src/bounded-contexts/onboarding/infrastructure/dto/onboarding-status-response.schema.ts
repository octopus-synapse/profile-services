import { z } from 'zod';

const OnboardingStatusResponseSchema = z.object({
  hasCompletedOnboarding: z.boolean(),
  onboardingCompletedAt: z.string().datetime().nullable().optional(),
});

export type OnboardingStatusResponseDto = z.infer<typeof OnboardingStatusResponseSchema>;
