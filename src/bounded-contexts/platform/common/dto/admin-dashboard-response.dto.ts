import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const AdminDashboardMetricsDataSchema = z.object({
  totalUsers: z.number().int(),
  totalResumes: z.number().int(),
  activeUsers7d: z.number().int(),
  activeUsers30d: z.number().int(),
  totalViews: z.number().int(),
  signupsThisWeek: z.number().int(),
  signupsThisMonth: z.number().int(),
  resumesThisWeek: z.number().int(),
  resumesThisMonth: z.number().int(),
  averageAtsScore: z.number().int(),
  onboardingCompletionRate: z.number().int(),
});

export class AdminDashboardMetricsDataDto extends createZodDto(AdminDashboardMetricsDataSchema) {}
