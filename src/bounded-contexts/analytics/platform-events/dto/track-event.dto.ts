import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const PlatformEventSchema = z.object({
  event: z.string().min(1).max(120),
  props: z.record(z.unknown()).optional(),
  occurredAt: z.string().datetime(),
});

const TrackEventsBodySchema = z.object({
  events: z.array(PlatformEventSchema).min(1).max(100),
});

export class TrackEventsBodyDto extends createZodDto(TrackEventsBodySchema) {}

const TrackEventsDataSchema = z.object({
  accepted: z.number().int().nonnegative(),
});

export class TrackEventsDataDto extends createZodDto(TrackEventsDataSchema) {}
