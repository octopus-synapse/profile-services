/**
 * API Response Interceptor
 *
 * Automatically wraps controller return values in { success: true, data: ... }.
 * If the controller already returns an object with `success` property, it passes through.
 *
 * This eliminates 171 instances of `return { success: true, data: result }` across 47 controllers.
 *
 * Controllers can now simply return the data:
 *   Before: return { success: true, data: result };
 *   After:  return result;
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        // Binary streams — pass through untouched
        if (data instanceof StreamableFile) {
          return data;
        }

        // Already wrapped — pass through
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Null/undefined (204 No Content responses) — don't wrap
        if (data === undefined || data === null) {
          return data;
        }

        // String responses (Prometheus metrics, etc.) — don't wrap
        if (typeof data === 'string') {
          return data;
        }

        return { success: true, data };
      }),
    );
  }
}
