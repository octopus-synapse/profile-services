import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MetricsGuard } from './metrics.guard';
import { MetricsService } from './metrics.service';

@ApiExcludeController()
@ApiTags('Metrics')
@Controller('metrics')
@UseGuards(MetricsGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({
    summary: 'Get Prometheus metrics',
    description: 'Returns service metrics in Prometheus exposition format.',
  })
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
