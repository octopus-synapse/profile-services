import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ViewCareerGraphRequestSchema = z.object({
  stack: z.array(z.string().min(1).max(60)).min(1).max(40),
  maxBuckets: z.number().int().min(1).max(40).default(20),
});

export class ViewCareerGraphRequestDto extends createZodDto(ViewCareerGraphRequestSchema) {}

const JobTitleCountSchema = z.object({ title: z.string(), count: z.number().int() });

const BucketSchema = z.object({
  experienceYears: z.number().int(),
  peerCount: z.number().int(),
  topJobTitles: z.array(JobTitleCountSchema),
});

const ProjectionSchema = z.object({
  yearsAhead: z.number().int(),
  bucket: BucketSchema.nullable(),
});

const ViewCareerGraphDataSchema = z.object({
  stack: z.array(z.string()),
  user: z.object({ experienceYears: z.number().int(), jobTitle: z.string().nullable() }),
  totalPeers: z.number().int(),
  current: BucketSchema.nullable(),
  buckets: z.array(BucketSchema),
  projections: z.array(ProjectionSchema),
});

export class ViewCareerGraphDataDto extends createZodDto(ViewCareerGraphDataSchema) {}
