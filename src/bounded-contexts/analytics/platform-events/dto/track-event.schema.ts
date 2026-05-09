import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

const PlatformEventSchema = z.object({
  event: z.string().min(1).max(120),
  props: z.record(z.unknown()).optional(),
  occurredAt: IsoDateTimeSchema,
});

const TrackEventsBodySchema = z.object({ events: z.array(PlatformEventSchema).min(1).max(100) });
const TrackEventsDataSchema = z.object({ accepted: z.number().int().nonnegative() });

export type PlatformEventDto = z.infer<typeof PlatformEventSchema>;

export type TrackEventsBodyDto = z.infer<typeof TrackEventsBodySchema>;

export type TrackEventsDataDto = z.infer<typeof TrackEventsDataSchema>;
