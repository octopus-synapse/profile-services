import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const GotoStepRequestSchema = z.object({
  stepId: z.string(),
});

export class GotoStepRequestDto extends createZodDto(GotoStepRequestSchema) {}
