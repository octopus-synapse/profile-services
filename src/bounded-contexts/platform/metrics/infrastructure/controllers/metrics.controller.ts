import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStreamResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { MetricsUseCases } from '../../application/ports/metrics.port';
import { MetricsGuard } from '../../metrics.guard';

@SdkExport({ tag: 'metrics', description: 'Prometheus Metrics API', requiresAuth: false })
@ApiTags('Metrics')
@Controller('metrics')
@UseGuards(MetricsGuard)
export class MetricsController {
  constructor(private readonly bc: MetricsUseCases) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({
    summary: 'Get Prometheus metrics',
    description: 'Returns service metrics in Prometheus exposition format.',
  })
  @ApiStreamResponse({ mimeType: 'text/plain', description: 'Prometheus metrics in text format' })
  async getMetrics(): Promise<string> {
    return this.bc.getPrometheusMetrics.execute();
  }
}
