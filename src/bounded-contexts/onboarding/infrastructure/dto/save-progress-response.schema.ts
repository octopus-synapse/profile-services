import { z } from 'zod';

const SaveProgressResponseSchema = z.object({
  currentStep: z.string(),
  completedSteps: z.array(z.string()),
});

export type SaveProgressResponseDto = z.infer<typeof SaveProgressResponseSchema>;
