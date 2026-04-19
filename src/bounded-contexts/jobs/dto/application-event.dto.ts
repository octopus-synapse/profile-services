import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RecordApplicationEventSchema = z.object({
  type: z.enum([
    'VIEWED',
    'INTERVIEW_SCHEDULED',
    'INTERVIEW_COMPLETED',
    'OFFER_RECEIVED',
    'REJECTED',
    'WITHDRAWN',
    'FOLLOW_UP_SENT',
  ]),
  note: z.string().max(2000).optional(),
  /** Optional override; defaults to now. Used when the user retroactively
   *  records an interview they forgot to log. */
  occurredAt: z.string().datetime().optional(),
});

export class RecordApplicationEventDto extends createZodDto(RecordApplicationEventSchema) {}
