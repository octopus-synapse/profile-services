/**
 * Metrics API Key Guard
 *
 * Protects the /metrics endpoint from unauthorized access.
 * Validates requests using the X-Metrics-Key header against METRICS_API_KEY env var.
 * If METRICS_API_KEY is not configured, the endpoint is blocked by default.
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class MetricsGuard implements CanActivate {
  private readonly logger = new Logger(MetricsGuard.name);
  private readonly metricsApiKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.metricsApiKey = this.configService.get<string>('METRICS_API_KEY');
    if (!this.metricsApiKey) {
      this.logger.warn(
        'METRICS_API_KEY is not configured. /metrics endpoint will be inaccessible.',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.metricsApiKey) {
      throw new ForbiddenException('Metrics endpoint is not configured');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers['x-metrics-key'];

    if (providedKey !== this.metricsApiKey) {
      throw new ForbiddenException('Invalid metrics API key');
    }

    return true;
  }
}
