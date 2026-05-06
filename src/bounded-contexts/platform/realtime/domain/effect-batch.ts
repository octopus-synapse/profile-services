/**
 * The unit of transmission across the SSE hub. A translator returns
 * one or more `EffectBatch`es (one per topic) for a single domain
 * event; the hub fans each batch out to every subscriber of the
 * corresponding topic.
 *
 * `correlationId` defaults to the originating `DomainEvent.eventId` so
 * client-side logs can match a UI effect back to its source event.
 */
import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import { EffectSchema } from './effect';

export const EffectBatchSchema = z.object({
  effects: z.array(EffectSchema).min(1),
  correlationId: z.string().optional(),
  ts: IsoDateTimeSchema,
});
export type EffectBatch = z.infer<typeof EffectBatchSchema>;
