import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ResumeConfigOperationDataSchema = z.object({
  success: z.boolean(),
});

export class ResumeConfigOperationDataDto extends createZodDto(ResumeConfigOperationDataSchema) {}
