import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const AdminMetricsCountersSchema = z.object({
  resumeCreated: z.number(),
  userSignups: z.number(),
  exportCompleted: z.number(),
});

const AdminMetricsGaugesSchema = z.object({
  activeUsers: z.number(),
  pendingExports: z.number(),
});

const AdminMetricsProcessSchema = z.object({
  uptimeSeconds: z.number(),
  heapUsedMb: z.number(),
  heapTotalMb: z.number(),
  eventLoopLagMs: z.number(),
});

const LatencySummaryEntrySchema = z.object({
  route: z.string(),
  totalRequests: z.number(),
  avgLatencyMs: z.number(),
  totalDurationS: z.number(),
});

const AdminMetricsOverviewDataSchema = z.object({
  counters: AdminMetricsCountersSchema,
  gauges: AdminMetricsGaugesSchema,
  process: AdminMetricsProcessSchema,
  latency: z.array(LatencySummaryEntrySchema),
});

export class AdminMetricsOverviewDataDto extends createZodDto(AdminMetricsOverviewDataSchema) {}
