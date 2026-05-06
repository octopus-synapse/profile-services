import { z } from 'zod';
import { FIT_DIMENSIONS } from '../domain/types';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

const SliderMapSchema = z.record(z.enum(FIT_DIMENSIONS), z.number().min(0).max(1));

const UpsertJobFitProfileRequestSchema = z.object({ sliders: SliderMapSchema });
const JobFitProfileResponseSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  editedByUserId: z.string(),
  computedAt: IsoDateTimeSchema,
  vector: z.object({ bigFive: SliderMapSchema, schwartz: SliderMapSchema, sdt: SliderMapSchema }),
});

export type SliderMapDto = z.infer<typeof SliderMapSchema>;

export type UpsertJobFitProfileRequestDto = z.infer<typeof UpsertJobFitProfileRequestSchema>;

export type JobFitProfileResponseDto = z.infer<typeof JobFitProfileResponseSchema>;
