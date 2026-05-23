import { z } from 'zod';

const GotoStepRequestSchema = z.object({ stepId: z.string() });

export type GotoStepRequestDto = z.infer<typeof GotoStepRequestSchema>;
