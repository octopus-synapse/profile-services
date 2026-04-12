import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SaveProgressResponseSchema = z.object({
  currentStep: z.string(),
  completedSteps: z.array(z.string()),
});

export class SaveProgressResponseDto extends createZodDto(SaveProgressResponseSchema) {}
