import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { AdminMetricsOverviewDataDto } from './dto/admin-metrics-response.dto';
import { MetricsService } from './metrics.service';

@SdkExport({
  tag: 'admin-metrics',
  description: 'Admin Metrics API',
  requiresAuth: true,
})
@ApiTags('Admin - Metrics')
@ApiBearerAuth()
@RequirePermission(Permission.PLATFORM_MANAGE)
@Controller('v1/admin/metrics')
export class AdminMetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get all metrics as JSON' })
  @ApiDataResponse(AdminMetricsOverviewDataDto, { description: 'Platform metrics overview' })
  async getOverview() {
    const [metricsJson, latencySummary] = await Promise.all([
      this.metricsService.getMetricsJson(),
      this.metricsService.getLatencySummary(),
    ]);

    // Extract key counters
    const resumeCreated = metricsJson.resume_created_total as Record<string, unknown> | undefined;
    const userSignups = metricsJson.user_signup_total as Record<string, unknown> | undefined;
    const exportCompleted = metricsJson.export_completed_total as
      | Record<string, unknown>
      | undefined;
    const activeUsers = metricsJson.active_users_total as Record<string, unknown> | undefined;
    const pendingExports = metricsJson.pending_exports_total as Record<string, unknown> | undefined;

    // Extract process metrics
    const processUptime = metricsJson.process_start_time_seconds as
      | Record<string, unknown>
      | undefined;
    const heapUsed = metricsJson.nodejs_heap_size_used_bytes as Record<string, unknown> | undefined;
    const heapTotal = metricsJson.nodejs_heap_size_total_bytes as
      | Record<string, unknown>
      | undefined;
    const eventLoopLag = metricsJson.nodejs_eventloop_lag_seconds as
      | Record<string, unknown>
      | undefined;

    return {
      counters: {
        resumeCreated: this.sumValues(resumeCreated),
        userSignups: this.sumValues(userSignups),
        exportCompleted: this.sumValues(exportCompleted),
      },
      gauges: {
        activeUsers: this.sumValues(activeUsers),
        pendingExports: this.sumValues(pendingExports),
      },
      process: {
        uptimeSeconds: processUptime
          ? Math.round(Date.now() / 1000 - this.firstValue(processUptime))
          : 0,
        heapUsedMb: heapUsed ? Math.round(this.firstValue(heapUsed) / 1024 / 1024) : 0,
        heapTotalMb: heapTotal ? Math.round(this.firstValue(heapTotal) / 1024 / 1024) : 0,
        eventLoopLagMs: eventLoopLag
          ? Math.round(this.firstValue(eventLoopLag) * 1000 * 100) / 100
          : 0,
      },
      latency: latencySummary,
    };
  }

  private sumValues(metric: Record<string, unknown> | undefined): number {
    if (!metric?.values) return 0;
    const values = metric.values as { value: number }[];
    return values.reduce((sum, v) => sum + v.value, 0);
  }

  private firstValue(metric: Record<string, unknown> | undefined): number {
    if (!metric?.values) return 0;
    const values = metric.values as { value: number }[];
    return values[0]?.value ?? 0;
  }
}
