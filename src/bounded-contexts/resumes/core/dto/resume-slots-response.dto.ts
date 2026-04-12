import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ResumeSlotsResponseSchema = z.object({
  used: z.number().int(),
  limit: z.number().int(),
  remaining: z.number().int(),
});

export class ResumeSlotsResponseDto extends createZodDto(ResumeSlotsResponseSchema) {}
