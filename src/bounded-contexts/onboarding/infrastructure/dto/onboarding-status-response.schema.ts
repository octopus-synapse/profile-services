import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

const OnboardingStatusResponseSchema = z.object({
  hasCompletedOnboarding: z.boolean(),
  onboardingCompletedAt: IsoDateTimeSchema.nullable().optional(),
});

export type OnboardingStatusResponseDto = z.infer<typeof OnboardingStatusResponseSchema>;
