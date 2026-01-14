import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const route = request.route?.path || request.url;

    const endTimer = this.metricsService.startApiTimer({
      method,
      route,
      status: '200', // Will be updated in tap
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode?.toString() || '200';

          // Record with actual status
          this.metricsService.observeApiLatency(endTimer(), {
            method,
            route,
            status: statusCode,
          });
        },
        error: (error) => {
          const statusCode = error.status?.toString() || '500';

          this.metricsService.observeApiLatency(endTimer(), {
            method,
            route,
            status: statusCode,
          });
        },
      }),
    );
  }
}
