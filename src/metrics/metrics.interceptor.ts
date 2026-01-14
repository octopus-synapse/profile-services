import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

interface HttpError {
  status?: number;
}

interface RequestWithRoute extends Request {
  route: { path: string };
}

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithRoute>();
    const method = request.method;
    const route = request.route.path;

    const endTimer = this.metricsService.startApiTimer({
      method,
      route,
      status: '200',
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          const statusCode = response.statusCode.toString();

          this.metricsService.observeApiLatency(endTimer(), {
            method,
            route,
            status: statusCode,
          });
        },
        error: (error: HttpError) => {
          const statusCode = (error.status ?? 500).toString();

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
