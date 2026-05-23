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
    // `occurredAt` is intentionally omitted from the example so the use
    // case defaults to `new Date()`. A hard-coded date would 400 in CI
    // whenever the contract probe runs more than a few days after the
    // example was authored — `RecordApplicationEventUseCase` rejects
    // any `occurredAt < application.createdAt`, and the fixture
    // application's `createdAt` is set to `now()` by the seed.
    example: {
      type: 'INTERVIEW_SCHEDULED',
      note: 'Initial screening with the hiring manager.',
    },
  });

export type RecordApplicationEventDto = z.infer<typeof RecordApplicationEventSchema>;
