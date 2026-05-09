import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const RecordApplicationEventSchema = z
  .object({
    type: z.enum([
      'VIEWED',
      'INTERVIEW_SCHEDULED',
      'INTERVIEW_COMPLETED',
      'OFFER_RECEIVED',
      'REJECTED',
      'WITHDRAWN',
      'FOLLOW_UP_SENT',
    ]),
    note: z
      .string()
      .max(2000)
      .optional() /** Optional override; defaults to now. Used when the user retroactively
     *  records an interview they forgot to log. */,
    occurredAt: IsoDateTimeSchema.optional(),
  })
  .openapi({
    example: {
      type: 'INTERVIEW_SCHEDULED',
      note: 'Initial screening with the hiring manager.',
      occurredAt: '2026-05-15T14:00:00Z',
    },
  });

export type RecordApplicationEventDto = z.infer<typeof RecordApplicationEventSchema>;
