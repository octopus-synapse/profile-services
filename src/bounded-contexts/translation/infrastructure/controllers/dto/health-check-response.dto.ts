import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const HealthCheckResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string().datetime(),
});

export class HealthCheckResponseDto extends createZodDto(HealthCheckResponseSchema) {}
