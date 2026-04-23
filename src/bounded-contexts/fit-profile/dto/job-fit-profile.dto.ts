import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { FIT_DIMENSIONS } from '../domain/types';

const SliderMapSchema = z.record(z.enum(FIT_DIMENSIONS), z.number().min(0).max(1));

const UpsertJobFitProfileRequestSchema = z.object({
  sliders: SliderMapSchema,
});

export class UpsertJobFitProfileRequestDto extends createZodDto(UpsertJobFitProfileRequestSchema) {}

const JobFitProfileResponseSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  editedByUserId: z.string(),
  computedAt: z.string().datetime(),
  vector: z.object({
    bigFive: SliderMapSchema,
    schwartz: SliderMapSchema,
    sdt: SliderMapSchema,
  }),
});

export class JobFitProfileResponseDto extends createZodDto(JobFitProfileResponseSchema) {}
