import { context, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import type { PipelineStage } from '@/shared-kernel/http/pipeline';

export interface RequestTracingDeps {
  readonly enabled: boolean;
  readonly service: string;
  readonly hashIdentifier?: (value: string | undefined | null) => string | undefined;
  readonly observeHttpRequest?: (input: {
    method: string;
    route: string;
    status: number;
    durationMs: number;
  }) => void;
}

export function requestTracingStage(deps: RequestTracingDeps): PipelineStage {
  return {
    name: 'requestTracing',
    async run(ctx, next) {
      const route = (ctx.state.__route as { path?: string } | undefined)?.path ?? '<unmatched>';
      const start = Date.now();
      if (!deps.enabled) {
        try {
          await next();
        } finally {
          deps.observeHttpRequest?.({
            method: ctx.method,
            route,
            status: (ctx.state.responseStatus as number | undefined) ?? 200,
            durationMs: Date.now() - start,
          });
        }
        return;
      }

      const tracer = trace.getTracer(deps.service);
      const span = tracer.startSpan(`HTTP ${ctx.method} ${route}`, {
        kind: SpanKind.SERVER,
        attributes: {
          'http.request.method': ctx.method,
          'http.route': route,
          'url.path': ctx.path,
        },
      });

      try {
        await context.with(trace.setSpan(context.active(), span), next);
      } catch (err) {
        span.recordException(err instanceof Error ? err : new Error(String(err)));
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw err;
      } finally {
        const status = (ctx.state.responseStatus as number | undefined) ?? 200;
        const durationMs = Date.now() - start;
        const userHash = deps.hashIdentifier?.(ctx.user?.userId);
        span.setAttributes({
          'http.response.status_code': status,
          'profile.duration_ms': durationMs,
          'profile.user_hash': userHash ?? '',
        });
        if (status >= 500) span.setStatus({ code: SpanStatusCode.ERROR });
        deps.observeHttpRequest?.({ method: ctx.method, route, status, durationMs });
        span.end();
      }
    },
  };
}
