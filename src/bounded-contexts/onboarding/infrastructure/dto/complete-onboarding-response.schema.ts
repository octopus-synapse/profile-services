import { z } from 'zod';

const CompleteOnboardingResponseSchema = z.object({ resumeId: z.string() });

export type CompleteOnboardingResponseDto = z.infer<typeof CompleteOnboardingResponseSchema>;
